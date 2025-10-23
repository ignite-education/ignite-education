-- Query to check the actual structure of the lessons table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'lessons'
ORDER BY
    ordinal_position;
