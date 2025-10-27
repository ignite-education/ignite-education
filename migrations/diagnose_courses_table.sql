-- Diagnostic query to see the current structure of the courses table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'courses'
ORDER BY
    ordinal_position;
