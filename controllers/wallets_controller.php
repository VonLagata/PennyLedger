<?php
$user = require_auth($conn);
$userId = (int) $user['user_id'];
require_once __DIR__ . '/../helpers/wallets.php';
ensure_physical_money($conn, $userId);
function wallet_row(array $row): array {
    return ['id' => (int) $row['wallet_id'], 'paymentMethodId' => (int) $row['payment_method_id'],
        'name' => $row['name'], 'kind' => $row['kind'], 'balance' => (float) $row['current_balance'], 'isDefault' => (bool) $row['is_default']];
}
if ($method === 'GET') {
    $stmt = mysqli_prepare($conn, wallet_current_sql() . ' WHERE w.user_id = ? AND w.deleted_at IS NULL ORDER BY w.is_default DESC, w.wallet_id');
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    send_success(array_map('wallet_row', mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC)));
}
if ($method === 'PUT' || $method === 'DELETE') {
    $stmt = mysqli_prepare($conn, 'SELECT * FROM Wallets WHERE wallet_id = ? AND user_id = ? AND deleted_at IS NULL');
    mysqli_stmt_bind_param($stmt, 'ii', $id, $userId);
    mysqli_stmt_execute($stmt);
    $wallet = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    if (!$wallet) send_error('Wallet not found', 404);
}
if ($method === 'DELETE') {
    if ($wallet['is_default']) send_error('Physical money cannot be deleted', 403);
    $check = mysqli_prepare($conn, wallet_current_sql() . ' WHERE w.wallet_id = ? AND w.user_id = ?');
    mysqli_stmt_bind_param($check, 'ii', $id, $userId);
    mysqli_stmt_execute($check);
    $closing = mysqli_fetch_assoc(mysqli_stmt_get_result($check));
    if (round((float) $closing['current_balance'], 2) != 0) send_error('Transfer or reconcile the balance to zero before closing this wallet', 422);
    $input = get_json_input();
    require_fields($input, ['password']);
    $stmt = mysqli_prepare($conn, 'SELECT password FROM Users WHERE user_id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    $account = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    if (!is_string($input['password']) || !password_verify($input['password'], $account['password'])) send_error('Incorrect password', 403);
    // Preserve payment references in transaction history while removing this wallet.
    $stmt = mysqli_prepare($conn, 'UPDATE Wallets SET deleted_at = NOW() WHERE wallet_id = ? AND user_id = ?');
    mysqli_stmt_bind_param($stmt, 'ii', $id, $userId);
    mysqli_stmt_execute($stmt);
    send_success(null, 'Wallet deleted');
}
if ($method === 'POST' || $method === 'PUT') {
    $input = get_json_input();
    require_fields($input, ['name', 'kind', 'balance']);
    $name = require_string($input['name'], 'name', 50);
    $kind = require_enum($input['kind'], 'kind', ['bank', 'digital', 'cash', 'other']);
    if (!is_numeric($input['balance']) || !is_finite((float) $input['balance']) || abs((float) $input['balance']) > 99999999.99) {
        send_error('Enter a balance between -99,999,999.99 and 99,999,999.99', 422);
    }
    if ($method === 'PUT' && $wallet['is_default']) { $name = 'Physical money'; $kind = 'cash'; }
    $balance = round((float) $input['balance'], 2);
    mysqli_begin_transaction($conn);
    try {
      if ($method === 'PUT') {
        $lock = mysqli_prepare($conn, 'SELECT wallet_id FROM Wallets WHERE wallet_id = ? AND user_id = ? FOR UPDATE');
        mysqli_stmt_bind_param($lock, 'ii', $id, $userId);
        mysqli_stmt_execute($lock);
        mysqli_stmt_store_result($lock);
        $current = mysqli_prepare($conn, wallet_current_sql() . ' WHERE w.wallet_id = ? AND w.user_id = ?');
        mysqli_stmt_bind_param($current, 'ii', $id, $userId);
        mysqli_stmt_execute($current);
        $currentRow = mysqli_fetch_assoc(mysqli_stmt_get_result($current));
        $openingBalance = (float) $currentRow['balance'];
        $previousBalance = (float) $currentRow['current_balance'];
        $adjustment = round($balance - $previousBalance, 2);
        if ($adjustment != 0) {
            $reason = trim((string) ($input['reason'] ?? 'Balance reconciliation'));
            if ($reason === '' || mb_strlen($reason) > 200) { mysqli_rollback($conn); send_error('Enter an adjustment reason (up to 200 characters)', 422); }
            $entry = mysqli_prepare($conn, 'INSERT INTO Wallet_Adjustments (user_id, wallet_id, previous_balance, new_balance, amount, reason) VALUES (?, ?, ?, ?, ?, ?)');
            mysqli_stmt_bind_param($entry, 'iiddds', $userId, $id, $previousBalance, $balance, $adjustment, $reason);
            mysqli_stmt_execute($entry);
        }
        $paymentId = (int) $wallet['payment_method_id'];
        $walletId = (int) $id;
        $stmt = mysqli_prepare($conn, 'UPDATE Wallets SET name = ?, kind = ?, balance = ? WHERE wallet_id = ? AND user_id = ? AND deleted_at IS NULL');
        mysqli_stmt_bind_param($stmt, 'ssdii', $name, $kind, $openingBalance, $walletId, $userId);
        mysqli_stmt_execute($stmt);
        $stmt = mysqli_prepare($conn, 'UPDATE Payment_Methods SET payment_method_name = ? WHERE payment_method_id = ?');
        mysqli_stmt_bind_param($stmt, 'si', $name, $paymentId);
        mysqli_stmt_execute($stmt);
      } else {
        $stmt = mysqli_prepare($conn, 'INSERT INTO Payment_Methods (payment_method_name) VALUES (?)');
        mysqli_stmt_bind_param($stmt, 's', $name);
        mysqli_stmt_execute($stmt);
        $paymentId = mysqli_insert_id($conn);
        $stmt = mysqli_prepare($conn, 'INSERT INTO Wallets (user_id, payment_method_id, name, kind, balance) VALUES (?, ?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'iissd', $userId, $paymentId, $name, $kind, $balance);
        mysqli_stmt_execute($stmt);
        $walletId = mysqli_insert_id($conn);
      }
        mysqli_commit($conn);
    } catch (Throwable $error) { mysqli_rollback($conn); throw $error; }
    send_success(['id' => $walletId, 'paymentMethodId' => $paymentId, 'name' => $name, 'kind' => $kind, 'balance' => $balance, 'isDefault' => (bool) ($wallet['is_default'] ?? false)], $method === 'POST' ? 'Wallet added' : 'Wallet updated', $method === 'POST' ? 201 : 200);
}
send_error('Method not allowed', 405);
