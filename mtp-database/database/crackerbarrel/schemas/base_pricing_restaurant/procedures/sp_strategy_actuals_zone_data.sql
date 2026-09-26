--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_strategy_actuals_zone_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_strategy_actuals_zone_data

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_actuals_zone_data;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_actuals_zone_data(IN var_strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    -- Create temp zone breakdown table
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS temp_zone_data_%s;
CREATE TEMP TABLE temp_zone_data_%s AS
SELECT
    product_id,
    store_unnest AS store_id,
    segment_id,
    store_id AS effective_price_zone
FROM
    base_pricing_restaurant.bp_price_reco_current_v2,
    LATERAL UNNEST(store_ids) AS store_unnest
WHERE
    strategy_id = %s;
-- INDEX creation
CREATE INDEX idx_temp_zone_data_%s_id1
    ON temp_zone_data_%s USING btree (product_id, store_id, segment_id);
$query$,
    var_strategy_id,
    var_strategy_id,
    var_strategy_id,
    var_strategy_id,
    var_strategy_id
);
RAISE NOTICE 'Executing: %', sql_query;
EXECUTE sql_query;
RAISE NOTICE 'Creating temp_zone_data table: %', sql_query;
EXECUTE sql_query;
end_time := clock_timestamp();
RAISE NOTICE 'Time taken for temp_zone_data table : %', end_time - start_time;
-- TIME tracking
INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
    (strategy_id, procedure, start_date, end_date, time_taken)
VALUES
    (var_strategy_id, 'sp_strategy_actuals_zone_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;
