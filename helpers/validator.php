<?php
// Purpose: Check required fields and common value formats in API input.
// Used by controllers to return field-specific validation errors.

// REVISED from helpers/validator.php. These checks return field-specific 422
// errors so forms can explain exactly which value must be corrected.

function require_fields(array $data, array $required): void
{
    $errors = [];
    foreach ($required as $field) {
        if (!array_key_exists($field, $data) || $data[$field] === '' || $data[$field] === null) {
            $errors[$field] = 'This field is required';
        }
    }

    if ($errors !== []) {
        send_error('Validation failed', 422, $errors);
    }
}

function require_positive_number(mixed $value, string $field): float
{
    if (!is_numeric($value) || (float) $value <= 0) {
        send_error('Validation failed', 422, [$field => 'Must be greater than zero']);
    }

    return round((float) $value, 2);
}

function require_date(mixed $value, string $field): string
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', (string) $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        send_error('Validation failed', 422, [$field => 'Use YYYY-MM-DD']);
    }

    return $value;
}

function require_enum(mixed $value, string $field, array $allowed): string
{
    if (!in_array($value, $allowed, true)) {
        send_error('Validation failed', 422, [
            $field => 'Allowed values: ' . implode(', ', $allowed),
        ]);
    }

    return (string) $value;
}

function require_string(mixed $value, string $field, int $maxLength): string
{
    $value = trim((string) $value);
    if ($value === '' || mb_strlen($value) > $maxLength) {
        send_error('Validation failed', 422, [
            $field => "Must be between 1 and {$maxLength} characters",
        ]);
    }

    return $value;
}
