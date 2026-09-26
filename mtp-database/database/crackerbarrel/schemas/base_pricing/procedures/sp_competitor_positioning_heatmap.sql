--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:sp_competitor_positioning_heatmap stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_competitor_positioning_heatmap

DROP PROCEDURE IF EXISTS base_pricing.sp_competitor_positioning_heatmap;

CREATE OR REPLACE PROCEDURE base_pricing.sp_competitor_positioning_heatmap(IN cost_column text, IN price_column text)
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
DROP TABLE IF EXISTS base_pricing.bp_unlogged_competitor_positioning_heatmap;
CREATE UNLOGGED TABLE base_pricing.bp_unlogged_competitor_positioning_heatmap AS
WITH
    bucket_config AS (
        SELECT MAX(bpbd.max_range) AS infinity_threshold
        FROM base_pricing.bp_price_bucket_details bpbd
    ),
    competitor_pricing AS (
        SELECT
            cpwp.product_id,
            cpwp.store_id,
            cpwp.segment_id,
            cpwp.segment_name,
            cpwp.price_zone,
            cpwp.effective_price_zone,
            cpwp.%s,      -- cost column
            cpwp.%s,      -- price column
            cpwp.competitor_price,
            cpwp.competitor_name,
            cpwp.competitor_display_name,
            cpwp.price_difference_raw,
            cpwp.price_difference,
            cpwp.price_difference_percent_raw,
            cpwp.price_difference_percent,
            cpwp.price_category,
            CASE
                WHEN cpwp.price_category = 'Similar'::text
                    THEN 'Similar Price'::character varying
                ELSE COALESCE((
                           SELECT bpbd.category
                           FROM
                               base_pricing.bp_price_bucket_details bpbd
                               CROSS JOIN bucket_config bc
                           WHERE
                               UPPER(TRIM(BOTH FROM bpbd.direction)) = UPPER(cpwp.price_category)
                               AND cpwp.price_difference_percent BETWEEN bpbd.min_range AND bpbd.max_range
                               AND (bpbd.max_range >= 999 OR bpbd.min_range <= bpbd.max_range)
                           ORDER BY bpbd.min_range
                           LIMIT 1
                    ), 'Unknown Range')
                END AS price_bucket
           FROM temp_competitor_positioning_competitor_data cpwp
        )
SELECT *
FROM competitor_pricing cp;
-- INDEX creation
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_id1
    ON base_pricing.bp_unlogged_competitor_positioning_heatmap USING btree (product_id, store_id, competitor_name);
CREATE INDEX idx_bp_unlogged_competitor_positioning_heatmap_id2
    ON base_pricing.bp_unlogged_competitor_positioning_heatmap USING btree (product_id, store_id);
$query$,
    cost_column,
    price_column
);
    RAISE NOTICE 'Creating unlogged_competitor_positioning_heatmap table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for unlogged_competitor_positioning_heatmap table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_heatmap', start_time, end_time, end_time - start_time);
END;
$procedure$
;