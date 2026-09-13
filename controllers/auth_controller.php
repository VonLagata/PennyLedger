<?php
    // controllers/auth_controller.php
    // Handles account creation, login, and logout.
    // index.php already gave us: $conn (database), $method (GET/POST/etc),
    // and $action (register, login, or logout - taken from the URL).

    switch ($action) {
        case 'register':

            if ($method !== 'POST')  {
                send_error('Method not allowed', 405);
            }

            // Read the JSON body React sent, e.g. {"first_name": "Daniel", ...}
            $input = get_json_input();

            // Make sure none of these are missing before we go any further.
            // If something's missing, this stops the script and sends an error
            require_fields($input, ['first_name', 'last_name', 'email', 'password']);

            // Check if this email is already used by someone else
            $stmt = mysqli_prepare($conn, "SELECT user_id FROM Users WHERE email = ?");
            mysqli_stmt_bind_param($stmt, "s", $input['email']); // 's' = String
            mysqli_stmt_execute($stmt);
            $existing = mysqli_stmt_get_result($stmt);
            

            // fetch_assoc() returns a row if one was found, or null if not.
            // If it found something, that email is already taken.
            if (mysqli_fetch_assoc($existing)) {
                    // 409 = "Conflict" - the standard status for "this already exists"
                send_error('Email is already registered', 409);
            }
            
            // Turn the plain-text password into a secure, scrambled version.
            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);

            // NOW() is a MySQL function that fills in the current date/time
            // automatically - we don't need to send that from PHP.
            $stmt = mysqli_prepare($conn, "INSERT INTO Users 
                                            (first_name, last_name, email, password, created_at)
                                            VALUES 
                                                (?, ?, ?, ?, NOW())");
            
            mysqli_stmt_bind_param(
                $stmt, "ssss",
                $input['first_name'],
                $input['last_name'],
                $input['email'],
                $hashedPassword
            );
            
            // If the insert worked: send back the new user's auto-generated ID.
            // If it failed: send back MySQL's actual error message.
            mysqli_stmt_execute($stmt)
                ? send_success(['user_id' => mysqli_insert_id($conn)], 'Registered Successfully', 201)
                : send_error(mysqli_error($conn), 500);

            break;
        
        case 'login':

            if ($method !== 'POST') {
                send_error('Method not allowed', 405);
            }

            // Look up the user by the email they typed
            $input = get_json_input();
            require_fields($input, ['email', 'password']);

            // $user will be the full row (all their info) if found, or null if not.
            $stmt = mysqli_prepare($conn, "SELECT * FROM Users WHERE email = ?");
            mysqli_stmt_bind_param($stmt, "s", $input['email']);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);
            $user = mysqli_fetch_assoc($result);
            
            // Two checks combined with OR (any one failing means "reject"):
            if (!$user || !password_verify($input['password'], $user['password'])) {
                send_error('Invalid email or password', 401);
            }

            // Generate a long, random, unguessable string to act as their
            // "login pass" for future requests.
            $token = bin2hex(random_bytes(32));
            // random_bytes(32) makes 32 bytes of truly random data.
            // bin2hex() converts that into readable letters/numbers (hex text),

            // "i" = integer (user_id), "s" = string (the token itself)
            $stmt = mysqli_prepare($conn, "INSERT INTO Tokens (user_id, token)
                                            VALUES 
                                                (?, ?)");
            mysqli_stmt_bind_param($stmt, "is", $user['user_id'], $token);

            // Save this token in the database, linked to this user, so
            // require_auth() can look it up later on protected requests.
            mysqli_stmt_execute($stmt);


            send_success([
                // React will save this (e.g. in memory or localStorage)
                'token' => $token,
            
                // Notice: we deliberately do NOT include $user['password']
                // here, even though it's in $user - never send password
                // data back to the frontend, hashed or not.
                'user' => [
                    'user_id' => $user['user_id'],
                    'first_name' => $user['first_name'],
                    'last_name'  => $user['last_name'],
                    'email'      => $user['email'],
                ]
            ], 'Login Successful');
            break;

        case 'logout':

            if ($method !== 'POST') {
                send_error('Method not allowed', 405);
            }

            // Confirms they're sending a real, valid token before we let them
            // "log out" - reuses the same check from helpers/auth.php.
            $input = get_json_input(); // expects {"token": "abc123..."}
            $user_id = require_auth($conn, $input);
            // We don't need the returned user_id here, just the validation
            // that the token itself is real before we delete it.

            // Removing the token row means it can never be used again -
            // that IS what "logging out" means in a token-based system.
            $stmt = mysqli_prepare($conn, "DELETE FROM Tokens WHERE token = ?");
            mysqli_stmt_bind_param($stmt, "s", $input['token']); // use $input['token'] directly - no header needed
            mysqli_stmt_execute($stmt);

            send_success(null, 'Logged out successfully');
            break; // <-- this was missing before - without it, PHP falls through to 'default' below

        default:
             // Someone requested an action we don't recognize, e.g. /auth/blah
            send_error('Action not found', 404);
            break;
    }