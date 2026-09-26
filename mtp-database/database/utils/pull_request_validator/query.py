# SQL query to fetch column data types and nullability information from information_schema
# Used to validate data types in CSV files against database schema
DATA_TYPE_QUERY = """
SELECT 
    table_schema, 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ({table_names})
"""

# SQL query to fetch unique and primary key constraints from PostgreSQL system catalogs
# Returns constraint details including the columns that make up each constraint
# Filters for both unique ('u') and primary key ('p') constraints
UNIQUE_KEY_INDEX_QUERY = """
SELECT 
    ns.nspname AS table_schema,
    cls.relname AS table_name,
    con.conname AS constraint_name,
    con.contype,
    ARRAY_AGG(att.attname ORDER BY att.attnum) AS constraint_columns
FROM pg_constraint con
JOIN pg_class cls ON con.conrelid = cls.oid
JOIN pg_namespace ns ON cls.relnamespace = ns.oid
JOIN unnest(con.conkey) AS cols(attnum) ON TRUE
JOIN pg_attribute att ON att.attnum = cols.attnum AND att.attrelid = cls.oid
WHERE contype in ('u', 'p') and relname IN ({table_names})
GROUP BY ns.nspname, cls.relname, con.conname, con.contype;
"""

# SQL query to fetch foreign key constraints from PostgreSQL system catalogs
# Returns relationships between tables including source and target columns
# Used for validating foreign key references in CSV data
FOREIGN_KEY_INDEX_QUERY = """
SELECT 
    src_ns.nspname AS table_schema,
    src_cls.relname AS table_name,
    src_att.attname AS column_name,
    tgt_ns.nspname AS referenced_table_schema,
    tgt_cls.relname AS referenced_table_name,
    tgt_att.attname AS referenced_column_name
FROM pg_constraint con
JOIN pg_class src_cls ON con.conrelid = src_cls.oid
JOIN pg_namespace src_ns ON src_cls.relnamespace = src_ns.oid
JOIN pg_class tgt_cls ON con.confrelid = tgt_cls.oid
JOIN pg_namespace tgt_ns ON tgt_cls.relnamespace = tgt_ns.oid
JOIN unnest(con.conkey) WITH ORDINALITY AS src_cols(attnum, ord) ON TRUE
JOIN pg_attribute src_att ON src_att.attnum = src_cols.attnum AND src_att.attrelid = src_cls.oid
JOIN unnest(con.confkey) WITH ORDINALITY AS tgt_cols(attnum, ord) ON src_cols.ord = tgt_cols.ord
JOIN pg_attribute tgt_att ON tgt_att.attnum = tgt_cols.attnum AND tgt_att.attrelid = tgt_cls.oid
WHERE con.contype = 'f'
AND src_cls.relname IN ({table_names})
AND tgt_cls.oid NOT IN (SELECT inhrelid FROM pg_inherits)
ORDER BY src_ns.nspname, src_cls.relname, src_att.attname;
"""

# Simple query template to fetch all values from a specific primary key column
# Used for foreign key validation to check if referenced values exist
DATA_QUERY = """
SELECT {primary_key_column} as primary_key_value FROM {schema}.{table_name}
"""