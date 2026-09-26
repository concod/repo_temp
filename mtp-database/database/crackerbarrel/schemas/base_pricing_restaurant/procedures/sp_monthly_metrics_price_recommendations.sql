--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_monthly_metrics_price_recommendations_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_price_recommendations_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_price_recommendations;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_price_recommendations(IN strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    table_prefix text;
BEGIN
    start_time := clock_timestamp();
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_price_recommendations_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_price_recommendations_%s AS
WITH
    reco_union AS (
        SELECT
            bpr.strategy_id,
            bpr.opt_level_bins,
            bpr.product_id,
            bpr.store_id,
            bpr.segment_id,
            bpr.channel_id,
            bpr.base_price,
            bpr.cost,
            bpr.promotion_applied,
            bpr.store_ids,
            'finalized' AS source
        FROM base_pricing_restaurant.bp_price_reco_finalized_v2 bpr
        WHERE bpr.strategy_id = %s
        UNION ALL
        SELECT
            bpr.strategy_id,
            bpr.opt_level_bins,
            bpr.product_id,
            bpr.store_id,
            bpr.segment_id,
            bpr.channel_id,
            bpr.base_price,
            bpr.cost,
            bpr.promotion_applied,
            bpr.store_ids,
            'ia_recommended' AS source
        FROM base_pricing_restaurant.bp_price_reco_ia_v2 bpr
        WHERE bpr.strategy_id = %s
        UNION ALL
        SELECT
            bpr.strategy_id,
            bpr.opt_level_bins,
            bpr.product_id,
            bpr.store_id,
            bpr.segment_id,
            bpr.channel_id,
            bpr.base_price,
            cost,
            bpr.promotion_applied,
            bpr.store_ids,
            'current' AS source
        FROM base_pricing_restaurant.bp_price_reco_current_v2 bpr
        WHERE bpr.strategy_id = %s
    )
SELECT ru.*
FROM reco_union ru;
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_price_recommendations_%s_id1
    ON base_pricing_restaurant.temp_monthly_metrics_price_recommendations_%s (opt_level_bins);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    -- INDEX
    strategy_id,
    strategy_id
    );
    -- Execute the query
    RAISE NOTICE 'Creating temp_monthly_metrics_price_recommendations_% table: %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_price_recommendations_% table : %', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_monthly_metrics_price_recommendations',
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
