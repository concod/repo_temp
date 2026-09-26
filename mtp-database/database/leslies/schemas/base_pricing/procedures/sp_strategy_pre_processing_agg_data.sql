--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_pre_processing_agg_data_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_pre_processing_agg_data_1

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_pre_processing_agg_data;


CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_pre_processing_agg_data(IN strategy_id integer, IN default_zone_name text, IN gross_margin_type text, IN threshold_amount numeric)
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
    bucket_column_selection text := '';
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
    'ROUND(ocd.%s::NUMERIC, 2) AS %s,
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
    'ROUND(ocd.%s::NUMERIC, 2) AS %s,
    '
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
        bucket_column_selection := bucket_column_selection ||
        format(
    'ROUND(ocd.%s::NUMERIC, 2) AS %s,
    '
    , bucket_record.bucket_name
    , bucket_record.bucket_name
        );
    END LOOP;
    -- Build query for raw agg table
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_agg_data_%s;
CREATE UNLOGGED TABLE base_pricing.temp_strategy_pre_processing_agg_data_%s AS
WITH
    old_cost_data AS (
        SELECT
            sppadr.*,
            CASE
                WHEN sppfd.finalized_old_cost IS NOT NULL AND ABS(sppadr.cost - COALESCE(sppfd.finalized_cost, dzd.dz_cost)) <= %s
                    THEN COALESCE(sppfd.finalized_old_cost, dzd.dz_old_cost)
                WHEN sppadr.cost <> COALESCE(sppfd.finalized_cost, dzd.dz_cost)
                    THEN COALESCE(sppfd.finalized_cost, dzd.dz_cost)
                ELSE
                    NULL
            END AS effective_old_cost,
            CASE
                WHEN sppadr.cost <> COALESCE(sppfd.finalized_cost, dzd.dz_cost)
                    THEN COALESCE(sppfd.finalized_cost, dzd.dz_cost)
                ELSE
                    COALESCE(sppfd.finalized_old_cost, dzd.dz_old_cost)
            END AS old_cost,
            COALESCE(sppfd.finalized_price, dzd.dz_price) AS finalized_price
        FROM
            base_pricing.temp_strategy_pre_processing_agg_data_raw_%s sppadr
            LEFT JOIN base_pricing.temp_strategy_pre_processing_fin_data_%s sppfd
                ON sppadr.opt_level_bins = sppfd.opt_level_bins
            LEFT JOIN (
                SELECT
                    product_id,
                    channel_id,
                    segment_id,
                    MIN(finalized_cost) AS dz_cost,
                    MIN(finalized_old_cost) AS dz_old_cost,
                    MIN(finalized_effective_old_cost) AS dz_effective_old_cost,
                    COALESCE(
                        MODE() WITHIN GROUP (ORDER BY finalized_price),
                        percentile_cont(0.5) WITHIN GROUP (ORDER BY finalized_price),
                        AVG(finalized_price)
                    ) AS dz_price,
                    'IA Recommended' AS dz_source,
                    'Default Zone Price' AS dz_price_change_reason
                FROM
                    base_pricing.temp_strategy_pre_processing_fin_data_%s
                WHERE
                    price_zone_name = '%s'
                GROUP BY
                    product_id,
                    channel_id,
                    segment_id
            ) AS dzd
                ON sppadr.product_id = dzd.product_id
                AND sppadr.channel_id = dzd.channel_id
                AND sppadr.segment_id = dzd.segment_id
    )
SELECT
    ocd.strategy_id,
    ocd.opt_level_bins,
    -- Indetifier data
    ocd.product_id,
    ocd.store_id,
    ocd.segment_id,
    ocd.cluster,
    ocd.channel,
    ocd.channel_id,
    ocd.zone_structure_name,
    ocd.price_zone_name,
    ocd.effective_price_zone,
    ocd.size,
    ocd.uom,
    ocd.derived_size,
    ocd.derived_uom,
    -- Family & class data
    ocd.brand_family,
    ocd.brand_class,
    ocd.size_family,
    ocd.size_class,
    ocd.line_group,
    ocd.custom_family_1,
    ocd.custom_class_1,
    -- Pricing data
    ROUND(ocd.cost::NUMERIC, 2) AS cost,
    ROUND(ocd.price::NUMERIC, 2) AS price,
    ROUND(ocd.median_price::NUMERIC, 2) AS median_price,
    ocd.pre_price,
    ocd.price_lock,
    ocd.zone_exception,
    -- Dynamically build attribute columns
    %s
    -- Dynamically build competitor columns
    %s
    bucket_competitor_modes,
    bucket_competitor_names,
    -- Dynamically build bucket columns
    %s
    -- Calculated fields
    ocd.weekly_sales,
    ocd.num_stores,
    ocd.num_prices,
    ocd.store_ids,
    ocd.old_cost,
    ocd.effective_old_cost,
    (ocd.cost - old_cost) AS cost_changes,
    (ocd.cost - effective_old_cost) AS effective_cost_changes,
    CASE
        WHEN ABS(ocd.cost - ocd.effective_old_cost) > %s
            THEN
                CASE
                    WHEN '%s' = 'gross_margin_dollar'
                        THEN (ocd.finalized_price - ocd.old_cost) + ocd.cost
                    WHEN '%s' = 'gross_margin_percent'
                        THEN ocd.cost / (1 - ((ocd.finalized_price - ocd.effective_old_cost) / ocd.finalized_price))
                    ELSE
                        NULL::numeric
                END
        ELSE
            NULL
    END AS new_margin,
    ocd.finalized_price,
    1 AS include_all
FROM
    old_cost_data ocd;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_agg_data_%s_id1
    ON base_pricing.temp_strategy_pre_processing_agg_data_%s (opt_level_bins);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    threshold_amount,
    strategy_id,
    strategy_id,
    strategy_id,
    default_zone_name,
    attribute_column_selection,
    competitor_column_selection,
    bucket_column_selection,
    threshold_amount,
    gross_margin_type,
    gross_margin_type,
    -- INDEX
    strategy_id,
    strategy_id
);
    RAISE NOTICE 'Creating temp_strategy_pre_processing_agg_data_%s table - %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_agg_data_%s : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_agg_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;
