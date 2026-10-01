<?php
// Purpose: Read bearer tokens and enforce user or administrator access.
// Used by protected controllers through require_auth() and require_admin().

// REVISED from helpers/auth.php. Ownership comes from a bearer token, not a
// user_id supplied by the browser or a token embedded in the URL/body.

function bearer_token(): ?string
{
    // Apache sometimes forwards Authorization through REDIRECT_HTTP_AUTHORIZATION.
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '');
    if (!preg_match('/^Bearer\s+(.+)$/i', trim($header), $matches)) {
        return null;
    }

    return trim($matches[1]);
}

function require_auth(mysqli $conn): array
{
    $token = bearer_token();
    if (!$token) {
        send_error('Missing bearer token', 401);
    }

    // The database stores only this hash. A copied database cannot reveal the
    // raw token that a client must send in its Authorization header.
    $tokenHash = hash('sha256', $token);
    $stmt = mysqli_prepare($conn, "
        SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.status
        FROM Tokens t
        JOIN Users u ON u.user_id = t.user_id
        WHERE t.token = ?
          AND t.expires_at > NOW()
          AND u.deleted_at IS NULL
        LIMIT 1
    ");
    mysqli_stmt_bind_param($stmt, 's', $tokenHash);
    mysqli_stmt_execute($stmt);
    $user = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

    if (!$user || $user['status'] !== 'active') {
        send_error('Invalid or expired session', 401);
    }

    return $user;
}

function require_admin(mysqli $conn): array
{
    $user = require_auth($conn);
    if ($user['role'] !== 'admin') {
        send_error('Administrator access required', 403);
    }

    return $user;
}

function log_activity(mysqli $conn, int $actorId, string $activityCode, string $description): void
{
    $stmt = mysqli_prepare($conn, "
        INSERT INTO Activity_Logs (user_id, activity_type_id, activity_description, activity_date)
        SELECT ?, activity_type_id, ?, NOW()
        FROM Activity_Types
        WHERE code = ?
        LIMIT 1
    ");
    mysqli_stmt_bind_param($stmt, 'iss', $actorId, $description, $activityCode);
    mysqli_stmt_execute($stmt);
}
