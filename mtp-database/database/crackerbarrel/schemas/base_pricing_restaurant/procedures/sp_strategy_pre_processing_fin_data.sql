--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_pre_processing_fin_data_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_pre_processing_fin_data_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_pre_processing_fin_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_pre_processing_fin_data(IN strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text := '';
BEGIN
    start_time := clock_timestamp();
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_pre_processing_fin_data_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_strategy_pre_processing_fin_data_%s AS
WITH
    fin_data AS (
        SELECT
            product_id,
            store_id,
            channel_id,
            segment_id,
            CASE
                WHEN zone_exception = 1
                    THEN null::text
                ELSE price_zone_name
            END AS price_zone_name,
            cost AS finalized_cost,
            FALSE AS is_edited,
            old_cost AS finalized_old_cost,
            old_cost AS finalized_effective_old_cost,
            price AS finalized_price,
            source AS finalized_source,
            price_change_reason AS finalized_price_change_reason
        FROM
            base_pricing_restaurant.bp_price_reco_finalized_v2 bprf
        WHERE
            strategy_id = %s
    )
SELECT
    fd.*,
    CONCAT(fd.product_id, '_', fd.store_id, '_', COALESCE(bsrscm.cluster, fd.segment_id::text)) AS opt_level_bins 
FROM
    fin_data fd
    LEFT JOIN (
        SELECT segment_id, cluster
        FROM base_pricing_restaurant.bp_strategy_rule_segment_cluster_mapping
        WHERE strategy_id = %s
    ) AS bsrscm
        ON fd.segment_id = bsrscm.segment_id;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_fin_data_%s_id1
    ON base_pricing_restaurant.temp_strategy_pre_processing_fin_data_%s (opt_level_bins);
CREATE INDEX idx_temp_strategy_pre_processing_fin_data_%s_id2
    ON base_pricing_restaurant.temp_strategy_pre_processing_fin_data_%s (product_id, channel_id, segment_id);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    -- INDEX
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id   
);
    RAISE NOTICE 'Creating temp_strategy_pre_processing_fin_data_%s table - %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_fin_data_%s : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_fin_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;