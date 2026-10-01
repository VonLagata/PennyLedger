<?php
// Purpose: Return a consistent JSON shape for API success and error responses.
// Used by controllers; these functions finish the current HTTP request.

// REVISED from helpers/response.php. Every route now sends the same JSON shape:
// success: {status, message, data}; error: {status, message, errors?}.

function send_success($data = null, ?string $message = null, int $statusCode = 200): never
{
    http_response_code($statusCode);
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

function send_error(string $message, int $statusCode = 400, array $errors = []): never
{
    http_response_code($statusCode);
    $payload = [
        'status' => 'error',
        'message' => $message,
    ];

    if ($errors !== []) {
        $payload['errors'] = $errors;
    }

    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function get_json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }

    $input = json_decode($raw, true);
    if (!is_array($input)) {
        send_error('Request body must contain valid JSON', 400);
    }

    return $input;
}
