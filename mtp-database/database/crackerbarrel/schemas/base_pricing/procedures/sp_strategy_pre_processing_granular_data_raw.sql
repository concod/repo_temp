--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_pre_processing_granular_data_raw_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_pre_processing_granular_data_raw_1

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_pre_processing_granular_data_raw;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_pre_processing_granular_data_raw(IN strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    price_lock_column text;
    zone_exception_column text;
    attribute_record RECORD;
    attribute_column_selection text := '';
    comp_record RECORD;
    competitor_column_selection text := '';
    competitor_json_columns text := '';
    competitor_json_data text;
    bucket_record RECORD;
    bucket_column_selection text := '';
BEGIN
    start_time := clock_timestamp();
    -- Get price_lock and zone_exception columns
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
    -- Build dynamic attribute columns list
    FOR attribute_record IN 
        SELECT database_column, attribute_name
        FROM base_pricing.bp_product_store_attributes_metadata
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
    'psam.%s AS %s,
    '
    , attribute_record.database_column
    , attribute_record.attribute_name
        );
    END LOOP;
    -- Build dynamic competitor column list
    FOR comp_record IN 
        SELECT database_column, attribute_name
        FROM base_pricing.bp_competitor_attributes_metadata
        WHERE is_active IS TRUE
    LOOP
        -- for SELECT
        competitor_column_selection := competitor_column_selection ||
        format(
    'psam.%s AS %s,
    '
    , comp_record.database_column
    , comp_record.attribute_name
        );
        -- for JSON
        competitor_json_columns := competitor_json_columns ||
        format(
    '''%s'', CAST(%s AS float8), '
    , comp_record.attribute_name
    , comp_record.database_column
        );
    END LOOP;
    -- Remove trailing comma & check empty JSON
    IF competitor_json_columns = '' THEN
        competitor_json_data := '''{}''::json';
    ELSE
        competitor_json_columns := left(competitor_json_columns, length(competitor_json_columns) - 2);
        competitor_json_data := format('json_build_object(%s)', competitor_json_columns);
    END IF;
    -- Build dynamic bucket column list
    FOR bucket_record IN 
        SELECT bucket_name
        FROM base_pricing.bp_bucket_config
        WHERE is_active IS TRUE
    LOOP
        -- for SELECT
        bucket_column_selection := bucket_column_selection ||
        format(
    'psam.%s_bucket,
    psam.%s_mode,
    '
    , bucket_record.bucket_name
    , bucket_record.bucket_name
        );
    END LOOP;
    -- Build the SQL query
    sql_query := format(
$query$
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_granular_data_raw_%s;
CREATE UNLOGGED TABLE base_pricing.temp_strategy_pre_processing_granular_data_raw_%s AS
SELECT
    psam.product_id,
    psam.store_id,
    psam.segment_id,
    COALESCE(bprf.opt_level_bins, CONCAT(
        psam.product_id::text,
        '_',
        CASE WHEN psam.%s is TRUE OR psam.%s is TRUE or psam.effective_price_zone is NULL
            THEN CONCAT(
                psam.store_id::text,
                '_',
                psam.segment_id::text
            )
        ELSE CONCAT(
            psam.effective_price_zone,
            '_',
            COALESCE(bsrscm.cluster, psam.segment_id::text)
        ) END
    )) as opt_level_bins,
    psf.product_name,
    psf.store_name,
    psf.segment_name,
    bsrscm.cluster,
    -- Dynamic competitor data
    %s
    -- Dynamic bucket data
    %s
    -- Dynamic attribute columns
    %s
    -- Build competitor json
    %s AS competitor_prices,
    -- Static attribute columns
    psf.channel,
    psf.channel_id,
	tda.sales_units AS weekly_sales,
    CASE
	    WHEN psam.%s IS TRUE THEN psam.store_id::text
	    WHEN psam.effective_price_zone IS NULL THEN NULL
	    ELSE psam.effective_price_zone
	END AS effective_price_zone,
    psam.zone_structure,
    psam.price_zone
FROM
    base_pricing.bp_product_store_attributes_mapping_v4 psam
    INNER JOIN base_pricing.temp_strategy_pre_processing_psf_data_%s psf
        ON psam.product_id = psf.product_id
        AND psam.store_id = psf.store_id
        AND psam.segment_id = psf.segment_id
        AND UPPER(psam.attribute_10) = 'Y'
	LEFT JOIN base_pricing.bp_transaction_data_agg tda
	    ON psam.product_id = tda.product_id
	    AND psam.store_id = tda.store_id
	    AND psam.segment_id = tda.segment_id
    LEFT JOIN (
        SELECT segment_id, cluster
        FROM base_pricing.bp_strategy_rule_segment_cluster_mapping
        WHERE strategy_id = %s
    ) AS bsrscm
        ON psam.segment_id = bsrscm.segment_id
    LEFT JOIN (
        SELECT product_id, store_id::int4 as store_id, segment_id, opt_level_bins
        FROM base_pricing.bp_price_reco_finalized_v2
        WHERE
            strategy_id = %s
            AND FALSE       -- ADD check for is_edited
            AND store_id ~ '^[0-9]+$' 
    ) AS bprf
        ON psam.product_id = bprf.product_id
        AND psam.store_id = bprf.store_id
        AND psam.segment_id = bprf.segment_id;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_granular_data_raw_%s_id1
    ON base_pricing.temp_strategy_pre_processing_granular_data_raw_%s (product_id, store_id, segment_id);
CREATE INDEX idx_temp_strategy_pre_processing_granular_data_raw_%s_id2
    ON base_pricing.temp_strategy_pre_processing_granular_data_raw_%s (product_id);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    price_lock_column,
    zone_exception_column,
    competitor_column_selection,
    bucket_column_selection,
    attribute_column_selection,
    competitor_json_data,
    zone_exception_column,
    strategy_id,
    strategy_id,
    strategy_id,
    -- INDEX
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id
);
    RAISE NOTICE 'Creating temp_strategy_pre_processing_granular_data_raw_% - %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_granular_data_raw_% : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_granular_data_raw', start_time, end_time, end_time - start_time);
END;
$procedure$
;
