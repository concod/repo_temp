--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_forecast_bins_data_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_forecast_bins_data_2

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_forecast_bins_data;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_forecast_bins_data(IN strategy_id integer, IN product_hierarchy_string text, IN is_kvi text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    price_lock_column text;
    zone_exception_column text;
BEGIN
    start_time := clock_timestamp();
    -- Get dynamic price_lock and zone_exception column names
    -- price_lock
    SELECT MAX(database_column) AS column_name
    INTO price_lock_column
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE attribute_name = 'price_lock';
    -- zone_exception
    SELECT MAX(database_column) AS column_name
    INTO zone_exception_column
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE attribute_name = 'zone_exception';
    --
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing.unlogged_strategy_forecast_bins_data_%s_%s;
CREATE UNLOGGED TABLE base_pricing.unlogged_strategy_forecast_bins_data_%s_%s AS
SELECT DISTINCT
    bcam.product_id,
    %s,
    bcam.store_id,
    bcam.segment_id,
    buc.is_kvi,
    CONCAT(
        bcam.product_id::text,
        '_',
        CASE WHEN %s is TRUE or %s is TRUE or bcam.effective_price_zone is NULL
            THEN CONCAT(
                bcam.store_id::text,
                '_',
                bcam.segment_id::text
            )
        ELSE CONCAT(
            bcam.effective_price_zone,
            '_',
            COALESCE(bsrscm.cluster, bcam.segment_id::text)
        ) END
    ) as opt_level_bins,
    bsrscm.cluster
FROM
    base_pricing.bp_product_store_attributes_mapping_v4 bcam
    INNER JOIN (
        SELECT *
        FROM base_pricing.bp_strategy_products_stores
        WHERE
            strategy_id = %s
            AND is_kvi IS %s
    ) AS buc
        ON bcam.product_id = buc.product_id
        AND bcam.store_id = buc.store_id
        AND bcam.segment_id = buc.segment_id
    INNER JOIN base_pricing.bp_product_master bpm
        ON bcam.product_id = bpm.product_id
    LEFT JOIN (
        SELECT *
        FROM base_pricing.bp_strategy_rule_segment_cluster_mapping
        WHERE strategy_id = %s
    ) AS bsrscm
        ON bcam.segment_id = bsrscm.segment_id;
-- INDEX creation
CREATE INDEX idx_unlogged_strategy_forecast_bins_data_%s_%s_id1
    ON base_pricing.unlogged_strategy_forecast_bins_data_%s_%s USING btree (product_id, store_id, segment_id);
CREATE INDEX idx_unlogged_strategy_forecast_bins_data_%s_%s_id2
    ON base_pricing.unlogged_strategy_forecast_bins_data_%s_%s USING btree (%s, store_id, segment_id);
CREATE INDEX idx_unlogged_strategy_forecast_bins_data_%s_%s_id3
    ON base_pricing.unlogged_strategy_forecast_bins_data_%s_%s USING btree (is_kvi);
$query$,
    -- TABLE
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    product_hierarchy_string,
    price_lock_column,
    zone_exception_column,
    strategy_id,
    is_kvi,
    strategy_id,
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
    RAISE NOTICE 'Creating unlogged_strategy_forecast_bins_data_%_% table: %', strategy_id, is_kvi, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for unlogged_strategy_forecast_bins_data_%_% table : %', strategy_id, is_kvi, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_strategy_forecast_bins_data - ' ||
                CASE WHEN is_kvi = 'true' THEN 'KVI' ELSE 'NON KVI' END,
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
