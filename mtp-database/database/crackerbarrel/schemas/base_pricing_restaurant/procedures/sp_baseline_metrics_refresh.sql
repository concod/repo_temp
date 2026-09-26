--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_baseline_metrics_refresh_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_baseline_metrics_refresh_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_baseline_metrics_refresh;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_baseline_metrics_refresh()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    cost_column text;
    price_column text;
    eligibility_column text;
BEGIN
    start_time := clock_timestamp();
    -- Get dynamic cost, price, and eligibility column names
    -- cost
    SELECT MAX(database_column) AS column_name
    INTO cost_column
    FROM base_pricing_restaurant.bp_product_store_attributes_metadata
    WHERE
        is_active IS TRUE
        AND attribute_name IN ('total_cost');
    -- price
    SELECT MAX(database_column) AS column_name
    INTO price_column
    FROM base_pricing_restaurant.bp_product_store_attributes_metadata
    WHERE
        is_active IS TRUE
        AND attribute_name IN ('price');
    -- eligibility
    SELECT MAX(database_column) AS column_name
    INTO eligibility_column
    FROM base_pricing_restaurant.bp_product_store_attributes_metadata
    WHERE
        is_active IS TRUE
        AND attribute_name IN ('eligibility');
    -- DROP and CREATE TABLE bp_ps_filter_overall
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.bp_ps_filter_overall;
CREATE UNLOGGED TABLE base_pricing_restaurant.bp_ps_filter_overall AS
WITH raw_data AS (
    SELECT 
        psam.product_id,
        psam.channel_id,
        psam.store_id,
        psam.segment_id,
        psam.%s AS segment_cost,
        psam.%s AS segment_price,
        psam.%s AS eligibility
    FROM
        base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psam
    WHERE
        COALESCE(psam.%s, 0) > 0
        AND COALESCE(psam.%s, 0) > 0
        AND UPPER(psam.%s) = 'Y'
)
SELECT
    rd.product_id,
    rd.channel_id,
    rd.segment_id,
    ROUND(AVG(rd.segment_cost)::NUMERIC, 2) AS segment_cost,
    ROUND(AVG(rd.segment_price)::NUMERIC, 2) AS segment_price
FROM
    raw_data rd
GROUP BY
    rd.product_id,
    rd.channel_id,
    rd.segment_id;
-- INDEX creation
CREATE INDEX idx_bp_ps_filter_overall_id1
    ON base_pricing_restaurant.bp_ps_filter_overall USING btree (product_id, channel_id, segment_id);
$query$,
    -- TABLE
    cost_column,
    price_column,
    eligibility_column,
    cost_column,
    price_column,
    eligibility_column
);
    RAISE NOTICE 'Creating bp_ps_filter_overall table: %', sql_query;
    EXECUTE sql_query;
    RAISE NOTICE 'Time taken bp_ps_filter_overall table : %', end_time - start_time;
    -- DROP and CREATE TABLE baseline_sales_overall 
    sql_query := '
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.bp_baseline_sales_overall;
CREATE UNLOGGED TABLE base_pricing_restaurant.bp_baseline_sales_overall AS
SELECT 
    bsw.product_id,
    bsw.channel_id,
    bsw.segment_id,
    bsw.week_start_date,
    bpfo.segment_price,
    bpfo.segment_cost,
    (bsw.sales_units *
        (1 + bsw.elasticity_bp * (((bpfo.segment_price - bsw.min_cost)/NULLIF(bsw.min_cost, 0))
            - bsw.base_percentage))) AS segment_baseline_sales
FROM
    base_pricing_restaurant.bp_simulation_week bsw
    INNER JOIN base_pricing_restaurant.bp_ps_filter_overall bpfo
        USING (product_id, channel_id, segment_id);
-- INDEX creation
CREATE INDEX idx_bp_baseline_sales_overall_id1
    ON base_pricing_restaurant.bp_baseline_sales_overall USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_bp_baseline_sales_overall_id2
    ON base_pricing_restaurant.bp_baseline_sales_overall USING btree (week_start_date);
CREATE INDEX idx_bp_baseline_sales_overall_id3
    ON base_pricing_restaurant.bp_baseline_sales_overall USING btree (product_id);
CREATE INDEX idx_bp_baseline_sales_overall_id4
    ON base_pricing_restaurant.bp_baseline_sales_overall USING btree (segment_id);
';
    RAISE NOTICE 'Creating baseline_sales_overall table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken baseline_sales_overall table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_baseline_metrics_refresh', start_time, end_time, end_time - start_time);
END;
$procedure$
;
