-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sp_create_weekly_partitions_1106_kk runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_day_split_opt_kvi
-- comment: derived table for sp_create_weekly_partitions_1106_kk

DROP PROCEDURE if exists public.sp_create_weekly_partitions();

CREATE OR REPLACE PROCEDURE base_pricing.sp_create_weekly_partitions(IN table_name text, IN start_date date, IN end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    current_start date := start_date;
    current_end date;
    partition_name text;
    sql_stmt text;
BEGIN
    WHILE current_start <= end_date LOOP
        current_end := (current_start + INTERVAL '7 days')::date;
        partition_name := table_name || '_' || to_char(current_start, 'YYYYMMDD');
        sql_stmt := format(
$query$
CREATE TABLE IF NOT EXISTS base_pricing.%s
PARTITION OF base_pricing.%s
FOR VALUES FROM ('%s') TO ('%s');
$query$,
    partition_name,
    table_name,
    current_start,
    current_end
        );
        RAISE NOTICE '%', sql_stmt;
        EXECUTE sql_stmt;
        current_start := current_end;
    END LOOP;
END;
$procedure$
;