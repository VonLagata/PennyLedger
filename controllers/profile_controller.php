<?php
// Purpose: Read and change the signed-in user's profile and account details.
// Used by /profile routes for password, income estimate, and photo changes too.

// Editor-only declarations of route inputs supplied by public/index.php.
/** @var mysqli $conn */
/** @var string $method */
/** @var string $profileAction */

// NEW file. Own-account reads/changes, password replacement, and photo upload
// share one controller. The user's identity always comes from the token.

$currentUser = require_auth($conn);
$userId = (int) $currentUser['user_id'];

function profile_response(mysqli $conn, int $userId): array
{
    $stmt = mysqli_prepare($conn, "
        SELECT user_id, first_name, last_name, email, phone, photo_path,
               monthly_income_estimate, role, status, created_at
        FROM Users WHERE user_id = ? AND deleted_at IS NULL
    ");
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    $row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    return [
        'id' => (int) $row['user_id'],
        'firstName' => $row['first_name'],
        'lastName' => $row['last_name'],
        'name' => trim($row['first_name'] . ' ' . $row['last_name']),
        'email' => $row['email'],
        'phone' => $row['phone'] ?? '',
        'photoUrl' => $row['photo_path'],
        'monthlyIncomeEstimate' => (float) $row['monthly_income_estimate'],
        'role' => $row['role'],
        'status' => $row['status'],
        'createdAt' => $row['created_at'],
    ];
}

// The base route reads, updates, or closes the current account.
if ($profileAction === '') {
    // /profile manages the currently signed-in account only.
    if ($method === 'GET') send_success(profile_response($conn, $userId));

    if ($method === 'PUT') {
        $input = get_json_input();
        require_fields($input, ['first_name', 'last_name', 'email']);
        $firstName = require_string($input['first_name'], 'first_name', 100);
        $lastName = require_string($input['last_name'], 'last_name', 100);
        $email = filter_var(trim($input['email']), FILTER_VALIDATE_EMAIL);
        if (!$email) send_error('Validation failed', 422, ['email' => 'Enter a valid email address']);
        $phone = isset($input['phone']) ? trim($input['phone']) : '';
        if (mb_strlen($phone) > 30) send_error('Validation failed', 422, ['phone' => 'Maximum 30 characters']);

        // Users.email remains UNIQUE even for soft-deleted accounts. Check
        // every row so a reserved email gets a clear conflict response.
        $duplicate = mysqli_prepare($conn, 'SELECT user_id FROM Users WHERE email = ? AND user_id <> ?');
        mysqli_stmt_bind_param($duplicate, 'si', $email, $userId);
        mysqli_stmt_execute($duplicate);
        if (mysqli_fetch_assoc(mysqli_stmt_get_result($duplicate))) send_error('Email is already in use', 409);

        $stmt = mysqli_prepare($conn, 'UPDATE Users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE user_id = ?');
        mysqli_stmt_bind_param($stmt, 'ssssi', $firstName, $lastName, $email, $phone, $userId);
        mysqli_stmt_execute($stmt);
        send_success(profile_response($conn, $userId), 'Profile updated');
    }

    if ($method === 'DELETE') {
        mysqli_begin_transaction($conn);
        $stmt = mysqli_prepare($conn, "UPDATE Users SET status = 'suspended', deleted_at = NOW() WHERE user_id = ?");
        mysqli_stmt_bind_param($stmt, 'i', $userId);
        mysqli_stmt_execute($stmt);
        $tokens = mysqli_prepare($conn, 'DELETE FROM Tokens WHERE user_id = ?');
        mysqli_stmt_bind_param($tokens, 'i', $userId);
        mysqli_stmt_execute($tokens);
        mysqli_commit($conn);
        send_success(null, 'Account deleted');
    }
}

// Verify the old password before replacing its stored hash.
if ($profileAction === 'password' && $method === 'PUT') {
    // Changing a password requires the old password and revokes all sessions.
    $input = get_json_input();
    require_fields($input, ['current_password', 'new_password']);
    if (strlen($input['new_password']) < 8) {
        send_error('Validation failed', 422, ['new_password' => 'Use at least 8 characters']);
    }
    $read = mysqli_prepare($conn, 'SELECT password FROM Users WHERE user_id = ?');
    mysqli_stmt_bind_param($read, 'i', $userId);
    mysqli_stmt_execute($read);
    $row = mysqli_fetch_assoc(mysqli_stmt_get_result($read));
    if (!password_verify($input['current_password'], $row['password'])) {
        send_error('Current password is incorrect', 403);
    }
    $hash = password_hash($input['new_password'], PASSWORD_DEFAULT);
    $stmt = mysqli_prepare($conn, 'UPDATE Users SET password = ? WHERE user_id = ?');
    mysqli_stmt_bind_param($stmt, 'si', $hash, $userId);
    mysqli_stmt_execute($stmt);
    mysqli_query($conn, "DELETE FROM Tokens WHERE user_id = {$userId}");
    send_success(null, 'Password updated; please sign in again');
}

// Save the income estimate used by the personal finance view.
if ($profileAction === 'income-estimate' && $method === 'PUT') {
    $input = get_json_input();
    require_fields($input, ['amount']);
    if (!is_numeric($input['amount']) || (float) $input['amount'] < 0) {
        send_error('Validation failed', 422, ['amount' => 'Must be zero or greater']);
    }
    $amount = round((float) $input['amount'], 2);
    $stmt = mysqli_prepare($conn, 'UPDATE Users SET monthly_income_estimate = ? WHERE user_id = ?');
    mysqli_stmt_bind_param($stmt, 'di', $amount, $userId);
    mysqli_stmt_execute($stmt);
    send_success(['monthlyIncomeEstimate' => $amount], 'Income estimate saved');
}

// Validate and store a new profile image.
if ($profileAction === 'photo' && $method === 'POST') {
    // Check the actual MIME type; a renamed executable is not a valid image.
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        send_error('A photo file is required', 422);
    }
    $file = $_FILES['photo'];
    if ($file['size'] > 1_000_000) send_error('Photo must be smaller than 1 MB', 422);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) send_error('Use a JPG, PNG, or WebP image', 422);

    $uploadDirectory = dirname(__DIR__) . '/public/uploads/profile';
    if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true)) {
        send_error('Photo storage is unavailable', 500);
    }
    $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $uploadDirectory . '/' . $filename)) {
        send_error('Photo could not be saved', 500);
    }
    $photoPath = '/uploads/profile/' . $filename;
    $stmt = mysqli_prepare($conn, 'UPDATE Users SET photo_path = ? WHERE user_id = ?');
    mysqli_stmt_bind_param($stmt, 'si', $photoPath, $userId);
    mysqli_stmt_execute($stmt);
    send_success(['photoUrl' => $photoPath], 'Photo updated', 201);
}

if ($profileAction === 'photo' && $method === 'DELETE') {
    $stmt = mysqli_prepare($conn, 'UPDATE Users SET photo_path = NULL WHERE user_id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    send_success(null, 'Photo removed');
}

send_error('Method not allowed', 405);
