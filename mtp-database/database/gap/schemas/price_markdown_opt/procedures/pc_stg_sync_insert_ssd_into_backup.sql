--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_stg_sync_insert_ssd_into_backup runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_sync_insert_ssd_into_backup

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_sync_insert_ssd_into_backup;

CREATE OR REPLACE procedure price_markdown_opt.pc_stg_sync_insert_ssd_into_backup(_strategy_id integer, _backup_table text, _ssd_table text, _pcd_id integer)
 LANGUAGE plpgsql
AS $procedure$
declare
    query_1 text;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    _part_pcd_start_date text;
begin
    SELECT to_char(pcd_start_date ,'yyyymmdd') as _part_pcd_start_date
    FROM (
        SELECT t1.pcd_start_date FROM price_markdown.tb_strategy_pcd t1
        where strategy_id = _strategy_id and pcd_id = _pcd_id group by 1) tab into _part_pcd_start_date;

    query_1 := format('
            INSERT INTO %5$s_%1$s_%2$s
            SELECT *
            FROM %3$s
            WHERE
                pcd_id = %4$s;',
            _strategy_id, _part_pcd_start_date, _ssd_table, _pcd_id, _backup_table);

        RAISE NOTICE 'query -- %', query_1;

        start_time := clock_timestamp();
        -- EXECUTE query_1;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL for event %: %',  _pcd_id, end_time - start_time;

END;
$procedure$
;
