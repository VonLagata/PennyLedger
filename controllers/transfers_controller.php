<?php
$user = require_auth($conn);
$userId = (int) $user['user_id'];
if ($method === 'GET') {
    $stmt = mysqli_prepare($conn, 'SELECT transfer_id AS id, from_wallet_id AS fromWalletId, to_wallet_id AS toWalletId, amount, created_at AS createdAt FROM Wallet_Transfers WHERE user_id = ? ORDER BY transfer_id DESC');
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    send_success(mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC));
}
if ($method !== 'POST') send_error('Method not allowed', 405);
$input = get_json_input();
require_fields($input, ['from_wallet_id', 'to_wallet_id', 'amount']);
$from = (int) $input['from_wallet_id'];
$to = (int) $input['to_wallet_id'];
$amount = require_positive_number($input['amount'], 'amount');
if ($from === $to || !is_finite($amount) || $amount > 99999999.99) send_error('Choose different wallets and a valid amount', 422);
mysqli_begin_transaction($conn);
try {
    $stmt = mysqli_prepare($conn, 'SELECT wallet_id FROM Wallets WHERE user_id = ? AND wallet_id IN (?, ?) AND deleted_at IS NULL ORDER BY wallet_id FOR UPDATE');
    mysqli_stmt_bind_param($stmt, 'iii', $userId, $from, $to);
    mysqli_stmt_execute($stmt);
    if (mysqli_num_rows(mysqli_stmt_get_result($stmt)) !== 2) {
        mysqli_rollback($conn); send_error('Wallet not found', 404);
    }
    require_once __DIR__ . '/../helpers/wallets.php';
    $balanceQuery = mysqli_prepare($conn, wallet_current_sql() . ' WHERE w.wallet_id = ? AND w.user_id = ?');
    mysqli_stmt_bind_param($balanceQuery, 'ii', $from, $userId);
    mysqli_stmt_execute($balanceQuery);
    $source = mysqli_fetch_assoc(mysqli_stmt_get_result($balanceQuery));
    if ((float) $source['current_balance'] < $amount) {
        mysqli_rollback($conn); send_error('The source wallet has insufficient funds', 422);
    }
    $stmt = mysqli_prepare($conn, 'INSERT INTO Wallet_Transfers (user_id, from_wallet_id, to_wallet_id, amount) VALUES (?, ?, ?, ?)');
    mysqli_stmt_bind_param($stmt, 'iiid', $userId, $from, $to, $amount);
    mysqli_stmt_execute($stmt);
    mysqli_commit($conn);
} catch (Throwable $error) { mysqli_rollback($conn); throw $error; }
send_success(null, 'Transfer recorded', 201);
