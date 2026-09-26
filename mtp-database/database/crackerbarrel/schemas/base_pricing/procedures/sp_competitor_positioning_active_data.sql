--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_competitor_positioning_active_data stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_competitor_positioning_active_data

DROP PROCEDURE IF EXISTS base_pricing.sp_competitor_positioning_active_data;

CREATE OR REPLACE PROCEDURE base_pricing.sp_competitor_positioning_active_data(IN segment_id integer)
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
DROP TABLE IF EXISTS temp_competitor_positioning_active_data;
CREATE TEMP TABLE temp_competitor_positioning_active_data AS
WITH
    bp_reco_raw AS (
        SELECT
            bprf.product_id,
            bprf.store_ids,
            bprf.segment_id,
            bprf.strategy_id,
            bprf.product_name,
            bprf.channel,
            bprf.start_date,
            bprf.end_date,
            sd.strategy_name,
            sd.strategy_status
        FROM
            base_pricing.bp_price_reco_finalized_v2 bprf
            INNER JOIN (
                SELECT
                    strategy_id,
                    bsm.strategy_name,
                    ssl.strategy_status_display_name AS strategy_status
                FROM
                    base_pricing.bp_strategy_master bsm
                    INNER JOIN base_pricing.bp_strategy_status_level ssl
                        USING (strategy_status_id)
                WHERE
                    CURRENT_DATE BETWEEN bsm.start_date AND bsm.end_date
                    AND ssl.strategy_status_value = 'active'
            ) sd
                USING (strategy_id)
        WHERE
            segment_id = %s
    ),
    bp_reco as (
        SELECT
            brr.product_id,
            store_unnest::INTEGER AS store_id,
            brr.segment_id,
            brr.strategy_id,
            brr.product_name,
            brr.channel,
            brr.start_date,
            brr.end_date,
            brr.strategy_name,
            brr.strategy_status
        FROM
            bp_reco_raw brr,
        LATERAL UNNEST(store_ids) AS store_unnest
    )
SELECT *
FROM bp_reco;
-- INDEX creation
CREATE INDEX idx_temp_competitor_positioning_active_data_id1
    ON temp_competitor_positioning_active_data USING btree (product_id, store_id);
$query$,
    segment_id
);
    RAISE NOTICE 'Creating temp_competitor_positioning_active_data table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_competitor_positioning_active_data table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_active_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;