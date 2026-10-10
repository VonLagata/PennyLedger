<?php
$user = require_auth($conn);
$userId = (int) $user['user_id'];
if ($method !== 'GET') send_error('Method not allowed', 405);
$stmt = mysqli_prepare($conn, "SELECT x.transfer_id AS id, 'transfer' AS kind, f.name AS source, t.name AS destination, x.amount, x.created_at AS createdAt, '' AS reason FROM Wallet_Transfers x JOIN Wallets f ON f.wallet_id = x.from_wallet_id JOIN Wallets t ON t.wallet_id = x.to_wallet_id WHERE x.user_id = ? UNION ALL SELECT a.adjustment_id, 'adjustment', w.name, w.name, a.amount, a.created_at, a.reason FROM Wallet_Adjustments a JOIN Wallets w ON w.wallet_id = a.wallet_id WHERE a.user_id = ? ORDER BY createdAt DESC, id DESC");
mysqli_stmt_bind_param($stmt, 'ii', $userId, $userId);
mysqli_stmt_execute($stmt);
send_success(mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC));
