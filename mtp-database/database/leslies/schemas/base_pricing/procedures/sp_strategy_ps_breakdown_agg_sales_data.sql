--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_agg_sales_data_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_ps_breakdown_agg_sales_data_1

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_ps_breakdown_agg_sales_data;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_ps_breakdown_agg_sales_data(IN strategy_id integer, IN comparison_column_1 text, IN comparison_value_1 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    filter_table_name text;
    agg_table_name text;
	index_name text;
BEGIN

    start_time := clock_timestamp();

    filter_table_name := format(
        'base_pricing.temp_strategy_ps_breakdown_filter_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    agg_table_name := format(
        'base_pricing.temp_strategy_ps_breakdown_agg_sales_data_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );
	-- Build a simple index name (no dots allowed)
    index_name := format(
        'idx_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    sql_query := format(
$query$

DROP TABLE IF EXISTS %s;

CREATE UNLOGGED TABLE %s AS
WITH
reco_union AS (

    SELECT
        bpr.strategy_id,
        bpr.product_id,
        bpr.segment_id,
        bpr.price_zone_name,
        SUM(bpr.baseline_sales) AS total_baseline_sales_units,
        SUM(bpr.sales_units) AS total_sales_units,
        'finalized' AS source
    FROM
        base_pricing.bp_price_reco_finalized_v2_%s bpr
        INNER JOIN (
            SELECT DISTINCT
                product_id,
                channel_id,
                segment_id,
                price_zone_name
            FROM %s
        ) pf
        USING (product_id, channel_id, segment_id, price_zone_name)
    WHERE bpr.store_id::text !~ '^[0-9]+$'
    GROUP BY
        bpr.strategy_id,
        bpr.product_id,
        bpr.segment_id,
        bpr.price_zone_name

    UNION ALL

    SELECT
        bpr.strategy_id,
        bpr.product_id,
        bpr.segment_id,
        bpr.price_zone_name,
        SUM(bpr.baseline_sales),
        SUM(bpr.sales_units),
        'ia_recommended'
    FROM
        base_pricing.bp_price_reco_ia_v2_%s bpr
        INNER JOIN (
            SELECT DISTINCT
                product_id,
                channel_id,
                segment_id,
                price_zone_name
            FROM %s
        ) pf
        USING (product_id, channel_id, segment_id, price_zone_name)
    WHERE bpr.store_id::text !~ '^[0-9]+$'
    GROUP BY
        bpr.strategy_id,
        bpr.product_id,
        bpr.segment_id,
        bpr.price_zone_name

    UNION ALL

    SELECT
        bpr.strategy_id,
        bpr.product_id,
        bpr.segment_id,
        bpr.price_zone_name,
        SUM(bpr.baseline_sales),
        SUM(bpr.sales_units),
        'current'
    FROM
        base_pricing.bp_price_reco_current_v2_%s bpr
        INNER JOIN (
            SELECT DISTINCT
                product_id,
                channel_id,
                segment_id,
                price_zone_name
            FROM %s
        ) pf
        USING (product_id, channel_id, segment_id, price_zone_name)
    WHERE bpr.store_id::text !~ '^[0-9]+$'
    GROUP BY
        bpr.strategy_id,
        bpr.product_id,
        bpr.segment_id,
        bpr.price_zone_name

)

SELECT *
FROM reco_union;

CREATE INDEX %s ON %s USING btree (product_id);

$query$,
        agg_table_name,
        agg_table_name,
        strategy_id,
        filter_table_name,
        strategy_id,
        filter_table_name,
        strategy_id,
        filter_table_name,
        index_name,
        agg_table_name
    );

    RAISE NOTICE 'Creating table: %', sql_query;

    EXECUTE sql_query;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken: %', end_time - start_time;

    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_ps_breakdown_agg_sales_data', start_time, end_time, end_time - start_time);

END;
$procedure$
;
