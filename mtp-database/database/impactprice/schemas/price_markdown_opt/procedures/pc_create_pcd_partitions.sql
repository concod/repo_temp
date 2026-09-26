--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::pc_create_pcd_partitions_01042026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_pcd_partitions_01042026

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_create_pcd_partitions(int4, text, text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_create_pcd_partitions(IN _strategy_id integer, IN _schema text, IN _table_name text)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
DECLARE
    _strategy_table text := _table_name || '_' || _strategy_id;
    w RECORD;
    sql_command text;
BEGIN
    -- Create the main partition for the specified strategy_id if it does not exist
    sql_command := format(
        'CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I
        FOR VALUES IN (%s) PARTITION BY RANGE (recommendation_date)',
        _schema,
        _strategy_table,
        _schema,
        _table_name,
        _strategy_id
    );
    RAISE NOTICE 'Executing 1: %', sql_command;
    EXECUTE sql_command;

    -- Create the default partition for the main partition
    sql_command := format(
        'CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I DEFAULT',
        _schema,
        _strategy_table || '_default',
        _schema,
        _strategy_table
    );
    RAISE NOTICE 'Executing 2: %', sql_command;
    EXECUTE sql_command;

    -- Loop through each date range and create subpartitions
    FOR w IN
        SELECT
            to_char(min(pcd_start_date), 'yyyymmdd') AS string_date,
            min(pcd_start_date) AS start_date,
            (max(pcd_end_date) + INTERVAL '1 day')::date AS end_date
        FROM
            price_markdown.tb_strategy_pcd_new fdm
        WHERE
            strategy_id = _strategy_id
        GROUP BY
            pcd_start_date
        ORDER BY 1
    LOOP
        sql_command := format(
            'CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I
            FOR VALUES FROM (%L) TO (%L)',
            _schema,
            _strategy_table || '_' || w.string_date::varchar,
            _schema,
            _strategy_table,
            w.start_date,
            w.end_date
        );
        RAISE NOTICE 'Executing 3: %', sql_command;
        EXECUTE sql_command;
    END LOOP;
END;
$procedure$
;