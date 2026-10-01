<?php
// Purpose: Store report snapshots and list, archive, or restore them.
// Used by /report-logs; each record belongs to the signed-in user.

// Editor-only declarations of route inputs supplied by public/index.php.
/** @var mysqli $conn */
/** @var string $method */
/** @var int|null $id */
/** @var string|null $action */

// NEW: The UI's report log used to live only in browser memory. This endpoint
// saves each generated snapshot and allows reversible archive/restore.
$currentUser = require_auth($conn);
$userId = (int) $currentUser['user_id'];

function report_log_row(array $row): array
{
    return [
        'id' => (int) $row['report_id'],
        'name' => $row['report_name'],
        'type' => $row['report_type'],
        'range' => $row['report_range'],
        'period' => $row['report_period'],
        'snapshot' => json_decode($row['snapshot_json'], true),
        'generated' => substr($row['generated_at'], 0, 10),
        'archived' => (bool) $row['archived'],
    ];
}

// List saved report snapshots for this user.
if ($method === 'GET') {
    $stmt = mysqli_prepare($conn, 'SELECT * FROM Report_Logs WHERE user_id = ? ORDER BY generated_at DESC, report_id DESC');
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    send_success(array_map('report_log_row', mysqli_fetch_all(mysqli_stmt_get_result($stmt), MYSQLI_ASSOC)));
}

// Save the generated report snapshot for later viewing.
if ($method === 'POST') {
    $input = get_json_input();
    
    require_fields($input, ['name', 'type', 'range', 'period', 'snapshot']);
    
    $name = require_string($input['name'], 'name', 200);
    $type = require_enum($input['type'], 'type', ['income-expense', 'category', 'budget', 'goals']);
    $range = require_string($input['range'], 'range', 30);
    $period = require_string($input['period'], 'period', 100);
    
    if (!is_array($input['snapshot'])) send_error('Snapshot must be an object', 422);
    
    $snapshotJson = json_encode($input['snapshot'], JSON_THROW_ON_ERROR);
    
    if (strlen($snapshotJson) > 100_000) send_error('Report snapshot is too large', 422);

    $stmt = mysqli_prepare($conn, "
        INSERT INTO Report_Logs
          (user_id, report_name, report_type, report_range, report_period, snapshot_json)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    mysqli_stmt_bind_param($stmt, 'isssss', $userId, $name, $type, $range, $period, $snapshotJson);
    mysqli_stmt_execute($stmt);
   
    $id = mysqli_insert_id($conn);
    $read = mysqli_prepare($conn, 'SELECT * FROM Report_Logs WHERE report_id = ? AND user_id = ?');
    
    mysqli_stmt_bind_param($read, 'ii', $id, $userId);
    mysqli_stmt_execute($read);

    send_success(report_log_row(mysqli_fetch_assoc(mysqli_stmt_get_result($read))), 'Report saved', 201);
}

// Archive or restore an existing snapshot without deleting it.
if ($method === 'PATCH' && $id && in_array($action, ['archive', 'restore'], true)) {
    $archived = $action === 'archive' ? 1 : 0;

    $stmt = mysqli_prepare($conn, 'UPDATE Report_Logs SET archived = ? WHERE report_id = ? AND user_id = ?');
    mysqli_stmt_bind_param($stmt, 'iii', $archived, $id, $userId);
    mysqli_stmt_execute($stmt);

    $read = mysqli_prepare($conn, 'SELECT * FROM Report_Logs WHERE report_id = ? AND user_id = ?');
    mysqli_stmt_bind_param($read, 'ii', $id, $userId);
    mysqli_stmt_execute($read);
    $row = mysqli_fetch_assoc(mysqli_stmt_get_result($read));

    if (!$row) send_error('Report not found', 404);
    send_success(report_log_row($row), 'Report archive status updated');
}

send_error('Method not allowed', 405);
