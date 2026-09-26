--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:sp_competitor_positioning_heatmap_details stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_competitor_positioning_heatmap_details

DROP PROCEDURE IF EXISTS base_pricing.sp_competitor_positioning_heatmap_details;

CREATE OR REPLACE PROCEDURE base_pricing.sp_competitor_positioning_heatmap_details(IN cost_column text, IN price_column text, IN channel_column text, IN segment_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    sql_query := format(
$query$
-- Table creation
DROP TABLE IF EXISTS base_pricing.bp_unlogged_competitor_positioning_heatmap_details;
CREATE UNLOGGED TABLE base_pricing.bp_unlogged_competitor_positioning_heatmap_details AS
WITH
    product_attributes AS (
        SELECT
            bpam.product_id,
            bpm.product_name,
            COALESCE(
                (
                   SELECT (attribute.value -> 'attribute_value' ->> 'current')::TEXT
                   FROM jsonb_array_elements(bpam.attributes) attribute(value)
                   WHERE attribute.value ->> 'attribute_name' = 'line_group'
                   LIMIT 1
                ),
                bpam.product_id::TEXT
            ) AS line_group
        FROM
            base_pricing.bp_product_master bpm
            INNER JOIN base_pricing.bp_product_attributes_mapping bpam
                ON bpm.product_id = bpam.product_id AND bpm.active IS TRUE
    ),
    transaction_data AS (
        SELECT
            btda.product_id,
            btda.store_id,
            btda.retail_unit_price,
            btda.sales_units
        FROM
            base_pricing.bp_transaction_data_agg btda
        WHERE
            segment_id = %s
    ),
    final_joined_data AS (
        SELECT
            pc.*,
            bsm.%s AS channel,
            pa.product_name,
            br.strategy_id,
            br.strategy_name,
            br.strategy_status,
            ROUND(td.retail_unit_price::NUMERIC, 2) AS historical_price,
            COALESCE(ROUND(td.sales_units::NUMERIC, 2), 0) AS sales_units,
            CASE
                WHEN br.start_date IS NOT NULL AND br.end_date IS NOT NULL
                    THEN daterange(br.start_date, br.end_date, '[]')
                ELSE NULL::daterange
                END AS date_range,
            COALESCE(NULLIF(pa.line_group, ''), pc.product_id::TEXT) AS line_group_computed,
            COALESCE(NULLIF(pc.price_zone, ''), pc.store_id::TEXT) AS price_zone_computed
        FROM
            base_pricing.bp_unlogged_competitor_positioning_heatmap pc
            INNER JOIN base_pricing.bp_store_master bsm
                USING (store_id)
            INNER JOIN product_attributes pa
                USING (product_id)
            LEFT JOIN transaction_data td
                USING (product_id, store_id)
            LEFT JOIN temp_competitor_positioning_active_data br
                USING (product_id, store_id)
       )
SELECT
    fjd.product_id,
    fjd.store_id,
    fjd.segment_id,
    fjd.segment_name,
    fjd.price_zone,
    fjd.effective_price_zone,
    %s,      -- cost column
    %s,      -- price column
    fjd.competitor_name,
    fjd.competitor_display_name,
    fjd.competitor_price,
    fjd.price_difference_percent_raw AS price_difference_percent,
    fjd.price_difference_raw AS price_difference,
    fjd.price_bucket,
    fjd.channel,
    fjd.product_name,
    fjd.strategy_id,
    fjd.historical_price,
    fjd.sales_units,
    fjd.date_range,
    fjd.strategy_name,
    fjd.line_group_computed,
    fjd.price_zone_computed,
    fjd.strategy_status
FROM
    final_joined_data fjd;
-- INDEX creation
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_details_id1
    ON base_pricing.bp_unlogged_competitor_positioning_heatmap_details USING btree (product_id, store_id);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_details_id2
    ON base_pricing.bp_unlogged_competitor_positioning_heatmap_details USING btree (competitor_display_name);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_details_id3
    ON base_pricing.bp_unlogged_competitor_positioning_heatmap_details USING btree (price_bucket);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_details_id4
    ON base_pricing.bp_unlogged_competitor_positioning_heatmap_details USING btree (price_zone_computed, line_group_computed);
$query$,
    segment_id,
    channel_column,
    cost_column,
    price_column
);
    RAISE NOTICE 'Creating bp_unlogged_competitor_positioning_heatmap_details table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for bp_unlogged_competitor_positioning_heatmap_details table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_heatmap_details', start_time, end_time, end_time - start_time);
END;
$procedure$
;