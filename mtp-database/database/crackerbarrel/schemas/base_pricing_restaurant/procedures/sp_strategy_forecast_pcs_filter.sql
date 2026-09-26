--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_forecast_pcs_filter_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_forecast_pcs_filter_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_forecast_pcs_filter;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_forecast_pcs_filter(IN strategy_id integer, IN product_hierarchy_string text, IN is_kvi text)
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
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_pcs_filter_%s_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.unlogged_strategy_forecast_pcs_filter_%s_%s AS
SELECT DISTINCT
    buc.product_id,
    %s,
    bsm.s0_cid AS channel_id,
    buc.segment_id,
    buc.is_kvi
FROM (
        SELECT *
        FROM base_pricing_restaurant.bp_strategy_products_stores
        WHERE
            strategy_id = %s
            AND is_kvi IS %s
    ) AS buc
    INNER JOIN base_pricing_restaurant.bp_product_master bpm
        ON buc.product_id = bpm.product_id
    INNER JOIN base_pricing_restaurant.bp_store_master bsm
        ON buc.store_id = bsm.store_id;
-- INDEX creation
CREATE INDEX idx_unlogged_strategy_forecast_pcs_filter_%s_%s_id1
    ON base_pricing_restaurant.unlogged_strategy_forecast_pcs_filter_%s_%s USING btree (product_id, channel_id, segment_id);
CREATE INDEX idx_unlogged_strategy_forecast_pcs_filter_%s_%s_id2
    ON base_pricing_restaurant.unlogged_strategy_forecast_pcs_filter_%s_%s USING btree (%s, channel_id, segment_id);
CREATE INDEX idx_unlogged_strategy_forecast_pcs_filter_%s_%s_id3
    ON base_pricing_restaurant.unlogged_strategy_forecast_pcs_filter_%s_%s USING btree (is_kvi);
$query$,
    -- TABLE
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    product_hierarchy_string,
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
    product_hierarchy_string,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi
    );
    -- Execute the query
    RAISE NOTICE 'Creating unlogged_strategy_forecast_pcs_filter_%_% table: %', strategy_id, is_kvi, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for unlogged_strategy_forecast_pcs_filter_%_% table : %', strategy_id, is_kvi, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_strategy_forecast_pcs_filter - ' ||
                CASE WHEN is_kvi = 'true' THEN 'KVI' ELSE 'NON KVI' END,
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;