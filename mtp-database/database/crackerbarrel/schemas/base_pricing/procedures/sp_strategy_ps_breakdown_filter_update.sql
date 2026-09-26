--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_filter_update_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_ps_breakdown_filter_update_2

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_ps_breakdown_filter_update;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_ps_breakdown_filter_update(IN strategy_id integer, IN comparison_column_1 text, IN comparison_value_1 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    filter_table_name text;
BEGIN

    start_time := clock_timestamp();

    filter_table_name := format(
        'base_pricing.temp_strategy_ps_breakdown_filter_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    sql_query := format(
$query$

DELETE
FROM %s
WHERE (product_id, store_id, segment_id) IN (
    SELECT
        bpr.product_id,
        bpr.store_id,
        bpr.segment_id
    FROM
        base_pricing.bp_price_reco_current_v2_%s bpr
        INNER JOIN %s sbf
        USING(product_id, store_id, segment_id)
);

$query$,
        filter_table_name,
        strategy_id,
        filter_table_name
    );

    RAISE NOTICE 'Updating temp table: %', sql_query;

    EXECUTE sql_query;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken: %', end_time - start_time;

    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_ps_breakdown_filter_update', start_time, end_time, end_time - start_time);

END;
$procedure$
;