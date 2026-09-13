<?php

    $servername = "localhost";
    $username = "root";
    $password = "";
    $dbname = "PersonalBudget_db";
    $port = "3307";


    // Create connections
    $conn = mysqli_connect($servername,
                            $username,
                            $password,
                            $dbname,
                            $port);

    // Check connections
    if (!$conn) {
        die("Connection failed: " . mysqli_connect_error());
    }

    // Make sure data is stored/read as UTF-8
    mysqli_set_charset($conn, "utf8mb4");

?>