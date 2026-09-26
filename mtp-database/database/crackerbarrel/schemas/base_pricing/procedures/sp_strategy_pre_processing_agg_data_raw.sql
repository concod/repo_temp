
--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_pre_processing_agg_data_raw_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_pre_processing_agg_data_raw_1

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_pre_processing_agg_data_raw;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_pre_processing_agg_data_raw(IN strategy_id integer, IN strategy_name text, IN start_date date, IN end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text := '';
    attribute_record RECORD;
    attribute_column_selection text := '';
    comp_record RECORD;
    competitor_column_selection text := '';
    bucket_record RECORD;
    bucket_selection_text text := '';
BEGIN
    start_time := clock_timestamp();
    -- Build dynamic attribute columns list
    FOR attribute_record IN 
        SELECT database_column, attribute_name
        FROM base_pricing.bp_product_store_attributes_metadata
        WHERE
            attribute_name IN (
                'reference_price_1',
                'reference_price_2'
            )
    LOOP
        -- for SELECT
        attribute_column_selection := attribute_column_selection ||
        format(
    'MIN(sppgd.%s) AS %s,
    '
    , attribute_record.attribute_name
    , attribute_record.attribute_name
        );
    END LOOP;
    -- Build dynamic competitor column list
    FOR comp_record IN 
        SELECT attribute_name
        FROM base_pricing.bp_competitor_attributes_metadata
        WHERE is_active IS TRUE
    LOOP
        -- for SELECT
        competitor_column_selection := competitor_column_selection ||
        format(
    'CASE
        WHEN COALESCE(SUM(tda.sales_units), 0) = 0
            THEN AVG(sppgd.%s)
        ELSE SUM(sppgd.%s * tda.sales_units) / SUM(tda.sales_units)
    END AS %s,
    '
    , comp_record.attribute_name
    , comp_record.attribute_name
    , comp_record.attribute_name
        );
    END LOOP;
    -- Build dynamic bucket column list
    FOR bucket_record IN 
        SELECT bucket_name
        FROM base_pricing.bp_bucket_config
        WHERE is_active IS TRUE
    LOOP
        -- for SELECT
        bucket_selection_text := bucket_selection_text ||
        format(
    'CASE
        WHEN COALESCE(SUM(tda.sales_units), 0) = 0
            THEN AVG(sppgd.%s)
        ELSE SUM(sppgd.%s * tda.sales_units) / SUM(tda.sales_units)
    END AS %s,
    '
    , bucket_record.bucket_name
    , bucket_record.bucket_name
    , bucket_record.bucket_name
        );
    END LOOP;
    -- Build query for raw agg table
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_agg_data_raw_%s;
CREATE UNLOGGED TABLE base_pricing.temp_strategy_pre_processing_agg_data_raw_%s AS
SELECT
    %s AS strategy_id,
    '%s' AS strategy_name,
    '%s' AS start_date,
    '%s' AS end_date,
    sppgd.opt_level_bins,
    -- Opt_level_bin level attributes
    MIN(CASE WHEN sppgd.price_lock IS TRUE THEN sppgd.store_id::text ELSE sppgd.effective_price_zone END) AS store_id,
    MIN(sppgd.product_id) AS product_id,
    MIN(sppgd.segment_id) AS segment_id,
    MIN(sppgd.product_name) AS product_name,
    MIN(sppgd.store_name) AS store_name,
    MIN(sppgd.segment_name) AS segment_name,
    MIN(sppgd.channel) AS channel,
    MIN(sppgd.channel_id) AS channel_id,
    MIN(sppgd.cluster) AS cluster,
    MIN(sppgd.effective_price_zone) AS effective_price_zone,
    MIN(sppgd.zone_structure_name) AS zone_structure_name,
    MIN(sppgd.price_zone_name) AS price_zone_name,
    -- Product level attributes
    MIN(sppgd.line_group) AS line_group,
    MIN(sppgd.launch_date) AS launch_date,
    MIN(sppgd.size) AS size,
    MIN(sppgd.uom) AS uom,
    MIN(sppgd.derived_size) AS derived_size,
    MIN(sppgd.derived_uom) AS derived_uom,
    MIN(sppgd.brand_family) AS brand_family,
    MIN(sppgd.brand_class) AS brand_class,
    MIN(sppgd.size_family) AS size_family,
    MIN(sppgd.size_class) AS size_class,
    MIN(sppgd.custom_family_1) AS custom_family_1,
    MIN(sppgd.custom_class_1) AS custom_class_1,
    -- Boolean aggregations
    BOOL_AND(sppgd.pre_price)::int AS pre_price,
    BOOL_AND(sppgd.is_kvi)::int AS is_kvi,
    BOOL_AND(sppgd.price_lock)::int AS price_lock,
    BOOL_AND(sppgd.zone_exception)::int AS zone_exception,
    FALSE AS is_edited,
    -- Dynamically build attribute columns
    %s
    -- Dynamically build competitor columns with weighted average
    %s
    -- Dynamically build bucket columns with weighted average
    %s
    MAX(bucket_competitor_modes::text)::jsonb  AS bucket_competitor_modes,
    MAX(bucket_competitor_names::text)::jsonb  AS bucket_competitor_names,
    -- Aggregate numeric fields
    percentile_cont(0.5) WITHIN GROUP (ORDER BY sppgd.price) AS median_price,
    AVG(sppgd.price) AS price,
    AVG(sppgd.total_cost) AS cost,
    SUM(sppgd.total_inventory) as total_inventory,
    SUM(tda.sales_units) AS weekly_sales,
    -- Additional columns
    COUNT(DISTINCT sppgd.store_id) AS num_stores,
    COUNT(DISTINCT sppgd.price) AS num_prices,
    ARRAY_AGG(sppgd.store_id::int4) AS store_ids
FROM
    base_pricing.temp_strategy_pre_processing_granular_data_%s sppgd
    LEFT JOIN base_pricing.bp_transaction_data_agg tda
        ON sppgd.product_id = tda.product_id
        AND sppgd.store_id = tda.store_id
        AND sppgd.segment_id = tda.segment_id
GROUP BY
    sppgd.opt_level_bins;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_agg_data_raw_%s_id1
    ON base_pricing.temp_strategy_pre_processing_agg_data_raw_%s (opt_level_bins);
CREATE INDEX idx_temp_strategy_pre_processing_agg_data_raw_%s_id2
    ON base_pricing.temp_strategy_pre_processing_agg_data_raw_%s (product_id, channel_id, segment_id);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_name,
    start_date,
    end_date,
    attribute_column_selection,
    competitor_column_selection,
    bucket_selection_text,
    strategy_id,
    -- INDEX
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id   
);
    RAISE NOTICE 'Creating temp_strategy_pre_processing_agg_data_raw_%s table - %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_agg_data_raw_%s : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_agg_data_raw', start_time, end_time, end_time - start_time);
END;
$procedure$
;
