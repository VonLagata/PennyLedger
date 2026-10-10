<?php
// The stored balance is the opening/adjustment amount. Transactions and
// transfers are counted once, including archived transactions.
function wallet_current_sql(): string {
    return "SELECT w.*, w.balance +
      COALESCE((SELECT SUM(CASE WHEN tt.code = 'income' THEN t.amount ELSE -t.amount END)
        FROM Transactions t JOIN TransactionTypes tt ON tt.transaction_type_id = t.transaction_type_id
        WHERE t.user_id = w.user_id AND (t.payment_method_id = w.payment_method_id
          OR (w.is_default = 1 AND NOT EXISTS (SELECT 1 FROM Wallets legacy_wallet
            WHERE legacy_wallet.user_id = t.user_id AND legacy_wallet.payment_method_id = t.payment_method_id)))), 0)
      + COALESCE((SELECT SUM(x.amount) FROM Wallet_Transfers x WHERE x.to_wallet_id = w.wallet_id AND x.user_id = w.user_id), 0)
      - COALESCE((SELECT SUM(x.amount) FROM Wallet_Transfers x WHERE x.from_wallet_id = w.wallet_id AND x.user_id = w.user_id), 0)
      + COALESCE((SELECT SUM(a.amount) FROM Wallet_Adjustments a WHERE a.wallet_id = w.wallet_id AND a.user_id = w.user_id), 0)
      AS current_balance FROM Wallets w";
}

function ensure_physical_money(mysqli $conn, int $userId): void {
    mysqli_begin_transaction($conn);
    try {
        $lock = mysqli_prepare($conn, 'SELECT user_id FROM Users WHERE user_id = ? FOR UPDATE');
        mysqli_stmt_bind_param($lock, 'i', $userId);
        mysqli_stmt_execute($lock);
        mysqli_stmt_store_result($lock);
        $find = mysqli_prepare($conn, 'SELECT wallet_id FROM Wallets WHERE user_id = ? AND is_default = 1');
        mysqli_stmt_bind_param($find, 'i', $userId);
        mysqli_stmt_execute($find);
        if (!mysqli_fetch_assoc(mysqli_stmt_get_result($find))) {
            mysqli_query($conn, "INSERT INTO Payment_Methods (payment_method_name) VALUES ('Physical money')");
            $paymentId = mysqli_insert_id($conn);
            $insert = mysqli_prepare($conn, "INSERT INTO Wallets (user_id, payment_method_id, name, kind, balance, is_default) VALUES (?, ?, 'Physical money', 'cash', 0, 1)");
            mysqli_stmt_bind_param($insert, 'ii', $userId, $paymentId);
            mysqli_stmt_execute($insert);
        }
        mysqli_commit($conn);
    } catch (Throwable $error) { mysqli_rollback($conn); throw $error; }
}
