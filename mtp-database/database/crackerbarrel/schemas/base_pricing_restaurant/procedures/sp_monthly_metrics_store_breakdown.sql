--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_monthly_metrics_store_breakdown_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_store_breakdown_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_store_breakdown;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_store_breakdown(IN strategy_id integer)
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
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_store_breakdown_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_store_breakdown_%s AS
SELECT
    bpr.product_id,
    store_unnest AS store_id,
    bpr.segment_id,
    bpr.channel_id,
    bpr.store_id AS effective_price_zone,
    bpr.opt_level_bins
FROM
    base_pricing_restaurant.bp_price_reco_current_v2 bpr,
    LATERAL UNNEST(store_ids) AS store_unnest
WHERE
    strategy_id = %s;
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_store_breakdown_%s_id1
    ON base_pricing_restaurant.temp_monthly_metrics_store_breakdown_%s (product_id, store_id, segment_id);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    strategy_id,
    -- INDEX
    strategy_id,
    strategy_id
    );
    -- Execute the query
    RAISE NOTICE 'Creating temp_monthly_metrics_store_breakdown_% table: %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_store_breakdown_% table : %', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_monthly_metrics_store_breakdown',
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;