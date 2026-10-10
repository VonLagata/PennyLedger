<?php
if (PHP_SAPI !== 'cli') exit;
require __DIR__ . '/../config/db.php';
require __DIR__ . '/../helpers/wallets.php';
mysqli_begin_transaction($conn);
try {
    $email = 'wallet-test-' . bin2hex(random_bytes(8)) . '@example.invalid';
    $stmt = mysqli_prepare($conn, "INSERT INTO Users (first_name, last_name, email, password, created_at) VALUES ('Test', 'Wallet', ?, 'unused', NOW())");
    mysqli_stmt_bind_param($stmt, 's', $email); mysqli_stmt_execute($stmt);
    $user = mysqli_insert_id($conn);
    $ids = [];
    foreach ([3000, 0] as $opening) {
        mysqli_query($conn, "INSERT INTO Payment_Methods (payment_method_name) VALUES ('Test wallet')");
        $payment = mysqli_insert_id($conn);
        mysqli_query($conn, "INSERT INTO Wallets (user_id, payment_method_id, name, kind, balance) VALUES ($user, $payment, 'Test', 'cash', $opening)");
        $ids[] = mysqli_insert_id($conn);
        if ($opening) $sourcePayment = $payment;
    }
    $category = mysqli_fetch_assoc(mysqli_query($conn, "SELECT c.category_id, c.transaction_type_id FROM Categories c JOIN TransactionTypes tt ON tt.transaction_type_id = c.transaction_type_id WHERE tt.code = 'expense' LIMIT 1"));
    if (!$category) throw new RuntimeException('Expense category required for test');
    $cat = (int) $category['category_id']; $type = (int) $category['transaction_type_id'];
    mysqli_query($conn, "INSERT INTO Transactions (user_id, category_id, transaction_type_id, amount, description, transaction_date, payment_method_id, archived, created_at) VALUES ($user, $cat, $type, 2150, 'Test expense', CURDATE(), $sourcePayment, 1, NOW())");
    $read = function () use ($conn, $user) {
        return mysqli_fetch_all(mysqli_query($conn, wallet_current_sql() . " WHERE w.user_id = $user ORDER BY w.wallet_id"), MYSQLI_ASSOC);
    };
    if ((float) $read()[0]['current_balance'] !== 850.0) throw new RuntimeException('Expense calculation failed');
    mysqli_query($conn, "INSERT INTO Wallet_Transfers (user_id, from_wallet_id, to_wallet_id, amount) VALUES ($user, {$ids[0]}, {$ids[1]}, 100)");
    $rows = $read();
    if ((float) $rows[0]['current_balance'] !== 750.0 || (float) $rows[1]['current_balance'] !== 100.0) throw new RuntimeException('Transfer calculation failed');
    echo "Wallet expense, archived expense, and transfer conservation checks passed.\n";
} finally { mysqli_rollback($conn); }
