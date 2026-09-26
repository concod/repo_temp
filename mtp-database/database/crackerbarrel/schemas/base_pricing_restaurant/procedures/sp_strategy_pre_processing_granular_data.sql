--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_pre_processing_granular_data stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_pre_processing_granular_data

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_pre_processing_granular_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_pre_processing_granular_data(IN strategy_id integer, IN strategy_name text, IN start_date date, IN end_date date)
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
    bucket_count int := 0;
    bucket_selection_text text := '';
    bucket_competitor_prices_text text := '';
    bucket_competitor_modes_text text := '';
    bucket_competitor_names_text text := '';
BEGIN
    start_time := clock_timestamp();
    -- Build dynamic attribute columns list
    FOR attribute_record IN 
        SELECT database_column, attribute_name
        FROM base_pricing_restaurant.bp_product_store_attributes_metadata
        WHERE
            attribute_name IN (
                'price',
                'total_cost',
                'price_lock',
                'zone_exception', 
                'total_inventory',
                'is_kvi',
                'reference_price_1',
                'reference_price_2'
            )
    LOOP
        -- for SELECT
        attribute_column_selection := attribute_column_selection ||
        format(
    'spppdr.%s,
    '
    , attribute_record.attribute_name
        );
    END LOOP;
    -- Build dynamic competitor column list
    FOR comp_record IN 
        SELECT database_column, attribute_name
        FROM base_pricing_restaurant.bp_competitor_attributes_metadata
        WHERE is_active IS TRUE
    LOOP
        -- for SELECT
        competitor_column_selection := competitor_column_selection ||
        format(
    'spppdr.%s,
    '
    , comp_record.attribute_name
        );
    END LOOP;
    -- Build dynamic bucket column list
    FOR bucket_record IN 
        SELECT bucket_name
        FROM base_pricing_restaurant.bp_bucket_config
        WHERE is_active IS TRUE
    LOOP
        -- for check
        bucket_count := bucket_count + 1;
        -- for SELECT
        bucket_selection_text := bucket_selection_text ||
        format(
    'sppbc.%s_price AS %s,
    '
    , bucket_record.bucket_name
    , bucket_record.bucket_name
        );
    END LOOP;
    IF bucket_count > 0 THEN
        -- bucket_competitor_prices json
        SELECT string_agg(
            format('''%s'', sppbc.%s_price', bucket_name, bucket_name), 
            ', '
        )
        INTO bucket_competitor_prices_text
        FROM base_pricing_restaurant.bp_bucket_config
        WHERE is_active IS TRUE;
        -- bucket_competitor_modes json
        SELECT string_agg(
            format('''%s_mode'', sppbc.%s_mode', bucket_name, bucket_name), 
            ', '
        )
        INTO bucket_competitor_modes_text
        FROM base_pricing_restaurant.bp_bucket_config
        WHERE is_active IS TRUE;
        -- bucket_competitor_names json
        SELECT string_agg(
            format(
                '''%s_competitor_names'', array_to_string(sppbc.%s_bucket, '', '')',
                bucket_name, 
                bucket_name
            ), 
            ', '
        )
        INTO bucket_competitor_names_text
        FROM base_pricing_restaurant.bp_bucket_config
        WHERE is_active IS TRUE;
    END IF;
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_pre_processing_granular_data_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_strategy_pre_processing_granular_data_%s AS
SELECT
    %s AS strategy_id,
    '%s' AS strategy_name,
    '%s' AS start_date,
    '%s' AS end_date,
    spppdr.product_id,
    spppdr.store_id,
    spppdr.segment_id,
    spppdr.opt_level_bins,
    spppdr.product_name,
    spppdr.store_name,
    spppdr.segment_name,
    spppdr.cluster,
    -- Product data
    spppd.line_group,
    spppd.pre_price,
    spppd.launch_date,
    spppd.size,
    spppd.uom,
    spppd.derived_size,
    spppd.derived_uom,
    spppd.brand_family,
    spppd.brand_class,
    spppd.size_family,
    spppd.size_class,
    spppd.custom_family_1,
    spppd.custom_class_1,
    -- Dynamic competitor data
    %s
    -- Dynamic attribute columns
    %s
    -- Build competitor json
    spppdr.competitor_prices,
    -- Static attribute columns
    spppdr.channel,
    spppdr.channel_id,
    spppdr.effective_price_zone,
    spppdr.zone_structure AS zone_structure_name,
    spppdr.price_zone AS price_zone_name,
	spppdr.weekly_sales,
    -- Dynamic bucket prices
    %s
    -- Build json columns
    jsonb_build_object(
        %s
    ) as bucket_competitor_prices,
    jsonb_build_object(
        %s
    ) as bucket_competitor_modes,
    jsonb_build_object(
        %s
    ) as bucket_competitor_names
FROM
    base_pricing_restaurant.temp_strategy_pre_processing_granular_data_raw_%s spppdr
    INNER JOIN base_pricing_restaurant.temp_strategy_pre_processing_product_data_%s spppd
        ON spppdr.product_id = spppd.product_id
    LEFT JOIN base_pricing_restaurant.temp_strategy_pre_processing_bucket_combine_%s sppbc
        ON spppdr.product_id = sppbc.product_id
        AND spppdr.store_id = sppbc.store_id
        AND spppdr.segment_id = sppbc.segment_id;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_granular_data_%s_id1
    ON base_pricing_restaurant.temp_strategy_pre_processing_granular_data_%s (product_id, store_id, segment_id);
CREATE INDEX idx_temp_strategy_pre_processing_granular_data_%s_id2
    ON base_pricing_restaurant.temp_strategy_pre_processing_granular_data_%s (opt_level_bins);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_name,
    start_date,
    end_date,
    competitor_column_selection,
    attribute_column_selection,
    bucket_selection_text,
    bucket_competitor_prices_text,
    bucket_competitor_modes_text,
    bucket_competitor_names_text,
    strategy_id,
    strategy_id,
    strategy_id,
    -- INDEX
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id   
);
    RAISE NOTICE 'Creating temp_strategy_pre_processing_granular_data_%s table - %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_granular_data_%s : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_granular_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;