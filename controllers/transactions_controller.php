<?php
    // controllers/transactions_controller.php
    // Handles income/expense entries - the core feature of the whole app.
    // UNLIKE categories/payment-methods, transactions belong to a SPECIFIC
    // user, so even GET (reading) requires login - you should only ever see
    // YOUR OWN transactions, never anyone else's.
    // index.php gave us: $conn, $method, $id.



    switch ($method) {
        case 'GET':
            // ---- Reading transactions - must be logged in ----
            // GET requests read the token from the URL query string instead
            // of a JSON body, e.g. ?token=abc123 - GETs aren't meant to carry
            // a request body, so this is the more standard approach.
            
            // require_auth() looks for $_GET['token'] this time (not $input).
            // Works the same either way, since it just checks for a 'token' key.
            $user_id = require_auth($conn, $_GET);
            

            if($id){
                // GET /transactions/5 - one specific transaction
                
                
                // Notice: we check BOTH the transaction_id AND that it belongs
                // to the logged-in user. This stops User A from viewing User
                // B's transaction just by guessing a different ID in the URL.
                $stmt = mysqli_prepare($conn, "SELECT * FROM Transactions WHERE transaction_id = ? AND user_id = ?");

                // "ii" for hte integer for both id and user_id
                mysqli_stmt_bind_param($stmt, "ii", $id, $user_id);
                mysqli_stmt_execute($stmt);
                $result = mysqli_stmt_get_result($stmt);
                $transaction = mysqli_fetch_assoc($result);

                $transaction
                    ? send_success($transaction)
                    : send_error('Transaction not found', 404);


            } else {
                // GET /transactions - list all of THIS user's transactions,
                // with optional filters via query string, e.g.
                // /transactions?category_id=2&start_date=2026-08-01&end_date=2026-08-31

                $sql = "SELECT * FROM Transactions WHERE user_id = ?";
                $type .= "i";      // will build up the bind_param types
                $params = [$user_id]; // will build up the actual values


                if (!empty($_GET['category_id'])) {
                    // If the URL includes a category_id (e.g. ?category_id=2), add an
                    // extra "AND category_id = ?" condition to the query, remember that
                    // this placeholder is an integer ("i"), and save the actual value
                    // to fill it in later.
                    $sql .= " AND category_id = ?";
                    $types .= "i";
                    $params[] = $_GET['category_id'];
                }

                if (!empty($_GET['transaction_type_id'])) {
                    // Same idea, but filtering by transaction_type_id instead
                    // (e.g. ?transaction_type_id=1 for Income only).
                    $sql .= " AND transaction_type_id = ?";
                    $types .= "i";
                    $params[] = $_GET['transaction_type_id'];
                }

                if (!empty($_GET['start_date'])) {
                    // If a start_date was given (e.g. ?start_date=2026-08-01), only
                    // include transactions on or after that date. Dates are text, so
                    // the placeholder type is "s" (string) instead of "i".
                    $sql .= " AND transaction_date >= ?";
                    $types .= "s";
                    $params[] = $_GET['start_date'];
                }

                if (!empty($_GET['end_date'])) {
                    // Same idea, but for the upper bound - only include transactions
                    // on or before this date.
                    $sql .= " AND transaction_date <= ?";
                    $types .= "s";
                    $params[] = $_GET['end_date'];
                }

                // Newest transactions first - usually what you want by default.
                $sql .= " ORDER BY transaction_date DESC";


                $stmt = mysqli_prepare($conn, $sql);
 
                // mysqli_stmt_bind_param needs each value as a SEPARATE argument,
                // not an array - but we built $params as an array above since we
                // didn't know in advance how many filters would be used. This
                // spreads the array out into individual arguments automatically.
                mysqli_stmt_bind_param($stmt, $types, ...$params);

                mysqli_stmt_execute($stmt);
                $result = mysqli_stmt_get_result($stmt);
                $transactions = mysqli_fetch_all($result, MYSQLI_ASSOC);
    
                send_success($transactions);
            }   
            break;

         case 'POST':
            // ---- Creating a new transaction - must be logged in ----
    
            $input = get_json_input();
            $user_id = require_auth($conn, $input);
    
            require_fields($input, [
                'category_id', 'transaction_type_id', 'amount',
                'description', 'transaction_date', 'payment_method_id'
            ]);
    
            if (!is_positive_number($input['amount'])) {
                send_error('Amount must be a positive number', 400);
            }
    
            $stmt = mysqli_prepare($conn, "INSERT INTO Transactions
                (user_id, category_id, transaction_type_id, amount, description, transaction_date, payment_method_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
    
            mysqli_stmt_bind_param(
                // i=user_id, i=category_id, i=transaction_type_id, d=amount (decimal),
                // s=description, s=transaction_date, i=payment_method_id
                $stmt, "iiidssi",

                // Notice: $user_id comes from require_auth() (who's actually
                // logged in), NOT from anything the user typed - this guarantees
                // a transaction can only ever be created under YOUR OWN account.
    
                $user_id,
                $input['category_id'],
                $input['transaction_type_id'],
                $input['amount'],
                $input['description'],
                $input['transaction_date'],
                $input['payment_method_id']
            );
           
            mysqli_stmt_execute($stmt)
                ? send_success(['transaction_id' => mysqli_insert_id($conn)], 'Transaction created', 201)
                : send_error(mysqli_error($conn), 500);
            break;
    
        case 'PUT':
            // ---- Updating an existing transaction - must be logged in AND own it ----
    
            if (!$id) send_error('Transaction ID required', 400);
    
            $input = get_json_input();
            $user_id = require_auth($conn, $input);
    
            require_fields($input, [
                'category_id', 'transaction_type_id', 'amount',
                'description', 'transaction_date', 'payment_method_id'
            ]);
    
            if (!is_positive_number($input['amount'])) {
                send_error('Amount must be a positive number', 400);
            }
            
            // The "AND user_id = ?" at the end is critical - it means this
            // UPDATE will only ever affect a row if it belongs to the
            // logged-in user. If someone tries to edit another user's
            // transaction ID, this query simply matches ZERO rows and
            // silently does nothing (checked below).
            $stmt = mysqli_prepare($conn, "UPDATE Transactions SET
                category_id = ?, transaction_type_id = ?, amount = ?,
                description = ?, transaction_date = ?, payment_method_id = ?
                WHERE transaction_id = ? AND user_id = ?");
            
    
            mysqli_stmt_bind_param(
                $stmt, "iidssiii",
                $input['category_id'],
                $input['transaction_type_id'],
                $input['amount'],
                $input['description'],
                $input['transaction_date'],
                $input['payment_method_id'],
                $id,
                $user_id
            );
    
            mysqli_stmt_execute($stmt);
            
            // affected_rows tells us how many rows the UPDATE actually
            // changed. If it's 0, either the ID doesn't exist, or it exists
            // but belongs to someone else - either way, we don't reveal
            // which, to avoid leaking info about other users' data.
            mysqli_stmt_affected_rows($stmt) > 0
                ? send_success(null, 'Transaction updated')
                : send_error('Transaction not found or not yours to edit', 404);
           
            break;
    
        case 'DELETE':
            // ---- Deleting a transaction - must be logged in AND own it ----
    
            if (!$id) send_error('Transaction ID required', 400);
    
            $input = get_json_input();
            $user_id = require_auth($conn, $input);
    
            $stmt = mysqli_prepare($conn, "DELETE FROM Transactions WHERE transaction_id = ? AND user_id = ?");
            mysqli_stmt_bind_param($stmt, "ii", $id, $user_id);
            mysqli_stmt_execute($stmt);
    
            mysqli_stmt_affected_rows($stmt) > 0
                ? send_success(null, 'Transaction deleted')
                : send_error('Transaction not found or not yours to delete', 404);
            break;
    
        default:
            send_error('Method not allowed', 405);
            break;
    }




