--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_store_split_data_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_ps_breakdown_store_split_data_2

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS procedure_name,
            pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'sp_strategy_ps_breakdown_store_split_data'
          AND n.nspname = 'base_pricing'
    LOOP
        EXECUTE format(
            'DROP PROCEDURE IF EXISTS %I.%I(%s);',
            r.schema_name,
            r.procedure_name,
            r.args
        );
    END LOOP;
END $$;



CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_ps_breakdown_store_split_data(IN strategy_id integer, IN product_hierarchy_string text, IN min_date date, IN max_date date, IN channel_id text, IN segment_id text, IN comparison_column_1 text, IN comparison_value_1 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    segment_ids_text text;
    table_name text;
    split_false_table text;
    split_true_table text;
BEGIN
    start_time := clock_timestamp();
    table_name := format(
        'strategy_ps_breakdown_store_split_data_%s_%s_%s_%s',
         strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    split_false_table := format(
        'base_pricing.temp_strategy_ps_breakdown_filter_split_%s_false_%s_%s',
         strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    split_true_table := format(
        'base_pricing.temp_strategy_ps_breakdown_filter_split_%s_true_%s_%s',
         strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    EXECUTE '
        SELECT COALESCE(string_agg(DISTINCT segment_id::text, '',''), ''9999'')
        FROM base_pricing.bp_simulation_store_split_ratio_kvi
        WHERE segment_id <> 0
    '
    INTO segment_ids_text;

    sql_query := format(
$query$

DROP TABLE IF EXISTS base_pricing.%s;

CREATE UNLOGGED TABLE base_pricing.%s AS

WITH split_data AS (

    SELECT
        sbf.product_id,
        sbf.store_id,
        sbf.segment_id,
        sbf.price_zone_name,
        bsssr.week_start_date,
        bsssr.store_split_ratio
    FROM
        base_pricing.bp_simulation_store_split_ratio bsssr
        INNER JOIN base_pricing.bp_product_master bpm
            USING (%s)
        INNER JOIN %s sbf
            ON sbf.product_id = bpm.product_id
            AND sbf.store_id = bsssr.store_id
            AND (
                sbf.segment_id = bsssr.segment_id
                OR (
                    sbf.segment_id NOT IN (%s)
                    AND bsssr.segment_id NOT IN (%s)
                )
            )
    WHERE
        bsssr.week_start_date BETWEEN '%s' AND '%s'

),

split_data_kvi AS (

    SELECT
        sbf.product_id,
        sbf.store_id,
        sbf.segment_id,
        sbf.price_zone_name,
        bsssr.week_start_date,
        bsssr.store_split_ratio
    FROM
        base_pricing.bp_simulation_store_split_ratio_kvi bsssr
        INNER JOIN %s sbf
            ON sbf.product_id = bsssr.product_id
            AND sbf.store_id = bsssr.store_id
            AND (
                sbf.segment_id = bsssr.segment_id
                OR (
                    sbf.segment_id NOT IN (%s)
                    AND bsssr.segment_id NOT IN (%s)
                )
            )
    WHERE
        bsssr.week_start_date BETWEEN '%s' AND '%s'

),

union_data AS (

    SELECT
        product_id,
        store_id,
        segment_id,
        price_zone_name,
        SUM(store_split_ratio) AS store_split_ratio
    FROM (
        SELECT * FROM split_data
        UNION ALL
        SELECT * FROM split_data_kvi
    ) ud
    GROUP BY
        product_id,
        store_id,
        segment_id,
        price_zone_name

),

total_data AS (

    SELECT
        product_id,
        segment_id,
        price_zone_name,
        SUM(store_split_ratio) AS total_store_split_ratio
    FROM union_data
    GROUP BY
        product_id,
        segment_id,
        price_zone_name

)

SELECT
    ud.product_id,
    ud.store_id,
    ud.segment_id,
    ud.price_zone_name,
    ud.store_split_ratio AS store_weight,
    td.total_store_split_ratio AS total_weight
FROM
    union_data ud
    INNER JOIN total_data td
        USING (product_id, segment_id);

CREATE INDEX idx_%s_1
ON base_pricing.%s (product_id, store_id, segment_id);

$query$,
        table_name,
        table_name,
        product_hierarchy_string,
        split_false_table,
        segment_ids_text,
        segment_ids_text,
        (min_date - INTERVAL '6 days')::date,
        max_date,
        split_true_table,
        segment_ids_text,
        segment_ids_text,
        (min_date - INTERVAL '6 days')::date,
        max_date,
        table_name,
        table_name
    );

    RAISE NOTICE 'Creating store split table: %', sql_query;

    EXECUTE sql_query;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken for store split table : %', end_time - start_time;

    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_ps_breakdown_store_split_data', start_time, end_time, end_time - start_time);

END;
$procedure$
;