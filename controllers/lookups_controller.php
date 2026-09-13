<?php
    // controllers/lookups_controller.php
    // Handles simple READ-ONLY tables that rarely/never change after seeding:
    // TransactionTypes, Goal_Statuses, Activity_Types.
    // These don't need POST/PUT/DELETE endpoints since you set them up once
    // in phpMyAdmin and your app just reads from them (e.g. for dropdowns).
    //
    // index.php gave us: $conn, $method, and $lookup_table (which table to
    // use - set in index.php based on the URL, e.g. /transaction-types).

    if ($method !== 'GET') {
        // These tables are read-only from the API's point of view, so any
        // method other than GET (POST/PUT/DELETE) is rejected immediately.
        send_error('Method not allowed - this is a read-only resource', 405);
    }

    // A small safety "allow list": only these exact URL names are permitted,
    // each mapped to its real database table name.
    $allowed_tables = [
        'transaction-types' => 'TransactionTypes',
        'goal-statuses'     => 'Goal_Statuses',
        'activity-types'    => 'Activity_Types',
    ];
    // Why this matters: $lookup_table comes from the URL the person typed.
    // If we just did "SELECT * FROM $lookup_table" directly using whatever
    // they typed, someone could type a weird URL and try to make our code
    // query a totally different (maybe private) table, or break the query
    // entirely. This list means only these 3 exact table names can ever be
    // used, no matter what shows up in the URL.

    if (!isset($allowed_tables[$lookup_table])) {
        // isset() checks if $lookup_table (e.g. "transaction-types") exists
        // as a KEY in our $allowed_tables list above.
        // If it's not one of our 3 known options, reject the request.
        send_error('Resource not found', 404);
    }

    $table_name = $allowed_tables[$lookup_table];
    // Looks up the REAL table name that matches the URL name, e.g.
    // "transaction-types" -> "TransactionTypes"

    // Since $table_name only ever comes from OUR OWN fixed list above (never
    // directly from what the user typed), it's safe to put it straight into
    // the SQL string here - there's no injection risk, because the user
    // never controls this exact value, only which key of our list gets picked.
    $result = mysqli_query($conn, "SELECT * FROM $table_name");
    $rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
    // Same pattern as before: run the query, grab every row as an array.

    send_success($rows);