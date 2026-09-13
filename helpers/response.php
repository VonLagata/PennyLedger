<?php
    function send_success($data = null, $message = null, $statusCode = 200){
        http_response_code($statusCode);

        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'data' => $data
        ]);
        exit; // stop here so nothing extra gets printed after

    }

    function send_error($message, $statusCode = 400) {
        http_response_code($statusCode); // set the status (400 = something's wrong)
        echo json_encode([
            'status'  => 'error',
            'message' => $message
        ]);
        exit;
    }
    
    function get_json_input() {
        // React sends new data as JSON text - read it and turn it into a normal array
        $input = json_decode(file_get_contents('php://input'), true);
    
        // If it wasn't valid JSON, just give back an empty array instead of breaking
        return is_array($input) ? $input : [];
    }
?>