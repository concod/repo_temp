--liquibase formatted sql
--changeset liquibase:pc_create_strategy_partition_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_strategy_partition

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_create_strategy_partition(int4, varchar, varchar);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_create_strategy_partition(IN _strategy_id integer, IN _table_schema character varying, IN _table_name character varying)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
BEGIN
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %1$s.%2$s_%3$s PARTITION OF %1$s.%2$s
        FOR VALUES IN (%3$s);', _table_schema, _table_name, _strategy_id);

END;
$procedure$
;