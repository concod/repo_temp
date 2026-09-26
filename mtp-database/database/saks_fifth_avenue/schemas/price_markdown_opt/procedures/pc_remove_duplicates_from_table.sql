--liquibase formatted sql
--changeset liquibase:pc_remove_duplicates_from_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_remove_duplicates_from_table

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_remove_duplicates_from_table;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_remove_duplicates_from_table(
    _schema_name TEXT,
    _table_name TEXT,
    _col1 TEXT,
    _col2 TEXT,
    _col3 TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _query TEXT;
BEGIN
    -- Build the dynamic query to remove duplicates
    _query := FORMAT($f$
        DELETE FROM %I.%I
        WHERE ctid NOT IN (
            SELECT MIN(ctid)
            FROM %I.%I
            GROUP BY %I, %I, %I
        );
    $f$,
        _schema_name, _table_name,  -- For DELETE statement
        _schema_name, _table_name,  -- For SELECT MIN(ctid)
        _col1, _col2, _col3        -- Columns for grouping
    );

    -- Execute the query
    EXECUTE _query;

    RAISE NOTICE 'Duplicates removed from %I.%I based on columns: %, %, %.',
        _schema_name, _table_name, _col1, _col2, _col3;
END;
$$;