<?php
    
    require __DIR__ . '/db.php';


    header('Content-Type: application/json');

    $result = mysqli_query($conn, "SELECT COUNT(*) AS user_count FROM Users");
    
    if($result){
        $row = mysqli_fetch_assoc($result);

        echo json_encode([
            'status' => 'success',
            'message' => 'Connected to PersonalBudget_db successfully.',
            'data' => $row
        ]);
    } else {
        http_response_code(500);
        echo json_encode([

            'status' => 'error',
            'message' => mysqli_error($conn)
        ]);
    }

    mysqli_close($conn);
    
?>