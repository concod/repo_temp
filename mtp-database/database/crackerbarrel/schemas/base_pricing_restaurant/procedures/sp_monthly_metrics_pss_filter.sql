--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_monthly_metrics_pss_filter_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_pss_filter_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_pss_filter;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_pss_filter(IN strategy_id integer, IN product_hierarchy_string text, IN is_kvi text)
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
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_pss_filter_%s_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_pss_filter_%s_%s AS
SELECT
    mmsb.product_id,
    %s,
    mmsb.store_id,
    mmsb.segment_id,
    mmsb.channel_id,
    mmsb.effective_price_zone,
    mmsb.opt_level_bins
FROM
    base_pricing_restaurant.temp_monthly_metrics_store_breakdown_%s mmsb
    INNER JOIN (
        SELECT *
        FROM base_pricing_restaurant.bp_strategy_products_stores
        WHERE
            strategy_id = %s
            AND is_kvi IS %s
    ) AS buc
        ON mmsb.product_id = buc.product_id
        AND mmsb.store_id = buc.store_id
        AND mmsb.segment_id = buc.segment_id
    INNER JOIN base_pricing_restaurant.bp_product_master bpm
        ON mmsb.product_id = bpm.product_id;
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_pss_filter_%s_%s_id1
    ON base_pricing_restaurant.temp_monthly_metrics_pss_filter_%s_%s (product_id, store_id, segment_id);
CREATE INDEX idx_temp_monthly_metrics_pss_filter_%s_%s_id2
    ON base_pricing_restaurant.temp_monthly_metrics_pss_filter_%s_%s (%s, store_id, segment_id);
$query$,
    -- TABLE
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    product_hierarchy_string,
    strategy_id,
    strategy_id,
    is_kvi,
    -- INDEX
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    product_hierarchy_string
    );
    -- Execute the query
    RAISE NOTICE 'Creating temp_monthly_metrics_pss_filter_%_% table: %', strategy_id, is_kvi, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_pss_filter_%_% table : %', strategy_id, is_kvi, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_monthly_metrics_pss_filter - ' ||
                CASE WHEN is_kvi = 'true' THEN 'KVI' ELSE 'NON KVI' END,
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
