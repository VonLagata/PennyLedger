<?php
    // Small reusable checks so we don't repeat the same code everywhere.

    function require_fields($data, $required) {
        $missing = []; // keep track of anything that's missing

        foreach ($required as $field) {
            // if the field doesn't exist, or it's empty, mark it as missing
            if (!isset($data[$field]) || $data[$field] === '') {
                $missing[] = $field;
            }
        }

        if (!empty($missing)) {
            // something was missing - stop and say exactly what
            send_error('Missing required field(s): ' . implode(', ', $missing), 400);
        }
        // if we get here, everything required was filled in
    }

    function is_positive_number($value) {
        // true only if it's a real number AND greater than zero
        return is_numeric($value) && $value > 0;
}