<?php 

    function require_auth($conn, $input){

        //get the token from the BODY instead of a header
        $token = $input['token'] ?? null;

        if (!$token) {
        send_error('Missing token in request body', 401);
            // Stops execution here if no token was sent at all.
        }

        // Check if this token actually exists in our Tokens table
        $stmt = mysqli_prepare($conn, "SELECT user_id FROM Tokens WHERE token = ?");
        mysqli_stmt_bind_param($stmt, "s", $token);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        $row = mysqli_fetch_assoc($result);
    
        if (!$row) {
            send_error('Invalid or expired token', 401); // token not found
        }
    
        return $row['user_id']; // token is valid - tell us WHO this is
    }
    // No closing 