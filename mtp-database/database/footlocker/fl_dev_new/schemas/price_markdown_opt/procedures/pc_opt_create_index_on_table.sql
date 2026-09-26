--liquibase formatted sql
--changeset liquibase:pc_opt_create_index_on_table_v090924 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_create_index_on_table

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_opt_create_index_on_table(_table_name TEXT, _index_name TEXT, _columns_clause TEXT);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_opt_create_index_on_table(
    _table_name TEXT,
    _index_name TEXT,
    _columns_clause TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Construct the dynamic SQL for creating the index
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I
        ON %s
        USING BTREE (%s);
    ', _index_name, _table_name, _columns_clause);

    RAISE NOTICE 'Index % on table % has been created (or already exists).', _index_name, _table_name;
END;
$$;