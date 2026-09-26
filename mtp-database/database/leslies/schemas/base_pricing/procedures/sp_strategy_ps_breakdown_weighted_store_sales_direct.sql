--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_weighted_store_sales_direct_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_ps_breakdown_weighted_store_sales_direct_2

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_ps_breakdown_weighted_store_sales_direct;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_ps_breakdown_weighted_store_sales_direct(IN strategy_id integer, IN comparison_column_1 text, IN comparison_value_1 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    filter_table_name text;
    output_table_name text;
BEGIN
    start_time := clock_timestamp();

    -- Construct table names to match filter SP
    filter_table_name := format(
        'base_pricing.temp_strategy_ps_breakdown_filter_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    output_table_name := format(
        'base_pricing.temp_strategy_ps_breakdown_wss_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    sql_query := format(
$query$

-- Drop existing table
DROP TABLE IF EXISTS %s;

-- Create table
CREATE UNLOGGED TABLE %s AS
WITH reco_union AS (

    SELECT
        bpr.strategy_id,
        bpr.product_id,
        bpr.store_id,
        bpr.segment_id,
        bpr.baseline_sales AS baseline_sales_units,
        bpr.sales_units,
        bpr.price_zone_name,
        'finalized' AS source
    FROM
        base_pricing.bp_price_reco_finalized_v2_%s bpr
        INNER JOIN %s sbf
        USING(product_id, store_id, segment_id)

    UNION ALL

    SELECT
        bpr.strategy_id,
        bpr.product_id,
        bpr.store_id,
        bpr.segment_id,
        bpr.baseline_sales AS baseline_sales_units,
        bpr.sales_units,
        bpr.price_zone_name,
        'ia_recommended' AS source
    FROM
        base_pricing.bp_price_reco_ia_v2_%s bpr
        INNER JOIN %s sbf
        USING(product_id, store_id, segment_id)

    UNION ALL

    SELECT
        bpr.strategy_id,
        bpr.product_id,
        bpr.store_id,
        bpr.segment_id,
        bpr.baseline_sales AS baseline_sales_units,
        bpr.sales_units,
        bpr.price_zone_name,
        'current' AS source
    FROM
        base_pricing.bp_price_reco_current_v2_%s bpr
        INNER JOIN %s sbf
        USING(product_id, store_id, segment_id)

)

SELECT
    strategy_id,
    source,
    product_id,
    store_id::int4 AS store_id,
    segment_id,
    price_zone_name,
    baseline_sales_units,
    sales_units
FROM reco_union;

-- Index
CREATE INDEX %I
ON %s USING btree (product_id, store_id, segment_id);

$query$,
        output_table_name,
        output_table_name,
        strategy_id,
        filter_table_name,
        strategy_id,
        filter_table_name,
        strategy_id,
        filter_table_name,
        strategy_id,
        output_table_name
    );

    RAISE NOTICE 'Creating weighted store sales table: %', sql_query;

    EXECUTE sql_query;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken for temp_strategy_ps_breakdown_wss_direct table: %', end_time - start_time;

    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_strategy_ps_breakdown_wss_direct',
            start_time,
            end_time,
            end_time - start_time
        );

END;
$procedure$
;