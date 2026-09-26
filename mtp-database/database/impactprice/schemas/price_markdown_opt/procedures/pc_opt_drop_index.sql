--liquibase formatted sql
--changeset liquibase:pc_opt_drop_index runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_drop_index

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_opt_drop_index(_index_name TEXT);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_opt_drop_index(_index_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format('DROP INDEX IF EXISTS %I;', _index_name);
END;
$$;