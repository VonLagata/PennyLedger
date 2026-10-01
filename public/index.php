<?php
// Purpose: Entry point for PHP API requests from the React application.
// Handles CORS, loads shared code, and routes each URL to a controller.

// REVISED from public/index.php. This is the single PHP entry point. The
// request path selects a controller; each controller handles method and ID.

$allowedOrigin = getenv('APP_ORIGIN') ?: 'http://127.0.0.1:5173';
// Match the configured React origin exactly; a wildcard would allow any site.
header("Access-Control-Allow-Origin: {$allowedOrigin}");
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/../config/db.php';
require __DIR__ . '/../helpers/response.php';
require __DIR__ . '/../helpers/validator.php';
require __DIR__ . '/../helpers/auth.php';

set_exception_handler(function (Throwable $exception): never {
    error_log((string) $exception);
    send_error('Unexpected server error', 500);
});

$scriptName = $_SERVER['SCRIPT_NAME'];
$requestPath = strtok($_SERVER['REQUEST_URI'], '?');
$request = trim(substr($requestPath, strlen($scriptName)), '/');
$segments = $request === '' ? [] : explode('/', $request);
// Example: /transactions/15/archive becomes [transactions, 15, archive].
$resource = $segments[0] ?? '';
$id = isset($segments[1]) && ctype_digit($segments[1]) ? (int) $segments[1] : null;
$action = $segments[2] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

switch ($resource) {
    case 'auth':
        $authAction = $segments[1] ?? '';
        require __DIR__ . '/../controllers/auth_controller.php';
        break;
    case 'transactions':
        require __DIR__ . '/../controllers/transactions_controller.php';
        break;
    case 'budgets':
        require __DIR__ . '/../controllers/budgets_controller.php';
        break;
    case 'goals':
        require __DIR__ . '/../controllers/goals_controller.php';
        break;
    case 'goal-contributions':
        require __DIR__ . '/../controllers/goal_contributions_controller.php';
        break;
    case 'reports':
        require __DIR__ . '/../controllers/reports_controller.php';
        break;
    case 'report-logs':
        require __DIR__ . '/../controllers/report_logs_controller.php';
        break;
    case 'profile':
        $profileAction = $segments[1] ?? '';
        require __DIR__ . '/../controllers/profile_controller.php';
        break;
    case 'admin':
        $adminAction = $segments[1] ?? 'users';
        $targetId = isset($segments[2]) && ctype_digit($segments[2]) ? (int) $segments[2] : null;
        $adminSubaction = $segments[3] ?? null;
        require __DIR__ . '/../controllers/admin_controller.php';
        break;
    case 'lookups':
        $lookup = $segments[1] ?? '';
        require __DIR__ . '/../controllers/lookups_controller.php';
        break;
    default:
        send_error('Resource not found', 404);
}
