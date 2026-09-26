--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_pre_processing_bucket_data stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_pre_processing_bucket_data

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_pre_processing_bucket_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_pre_processing_bucket_data(IN strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text := '';
    comp_record RECORD;
    competitor_columns text := '';
    competitor_case_statement text := '';
    bucket_record RECORD;
BEGIN
    start_time := clock_timestamp();
    -- Build dynamic CASE statement
    FOR comp_record IN 
        SELECT attribute_name, frontend_display_name
        FROM base_pricing_restaurant.bp_competitor_attributes_metadata
        WHERE is_active IS TRUE
    LOOP
        -- For select
        competitor_columns := competitor_columns ||
        format('
            %s,'
            , comp_record.attribute_name);
        -- CASE statement
        competitor_case_statement := competitor_case_statement ||
        format('
                WHEN cm.attribute_name = ''%s'' THEN pr.%s', 
            comp_record.attribute_name, comp_record.attribute_name);
    END LOOP;
    -- Remove trailing comma & check empty case statement
    IF competitor_columns = '' THEN
        competitor_case_statement := 'NULL AS competitor_price';
    ELSE
        competitor_columns := rtrim(competitor_columns, ',');
        competitor_case_statement := competitor_case_statement || '
                ELSE NULL
            END AS competitor_price';
    END IF;
    -- Process each active bucket
    FOR bucket_record IN 
        SELECT bucket_name
        FROM base_pricing_restaurant.bp_bucket_config
        WHERE is_active IS TRUE
        ORDER BY bucket_name
    LOOP
        -- Build query for this bucket
        sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_pre_processing_bucket_data_%s_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_strategy_pre_processing_bucket_data_%s_%s AS
WITH
    filtered_base AS (
        SELECT 
            product_id,
            store_id,
            segment_id,
            %s_bucket,
            %s_mode,
            -- Dynamic list of competitor columns
            %s
        FROM
            base_pricing_restaurant.temp_strategy_pre_processing_granular_data_raw_%s
        WHERE
            %s_bucket IS NOT NULL 
            AND (
                %s_mode IS NOT NULL
                OR array_length(%s_bucket, 1) > 0
            )
    ),
    competitor_mapping AS (
        SELECT
            frontend_display_name,
            attribute_name
        FROM
            base_pricing_restaurant.bp_competitor_attributes_metadata
        WHERE
            is_active IS TRUE
    ),
    processed_rows AS (
        SELECT 
            fb.*,
            UNNEST(fb.%s_bucket) AS competitor_display_name
        FROM
            filtered_base fb
    ),
    mapped_competitors AS (
        SELECT 
            pr.*,
            cm.attribute_name,
            CASE %s
        FROM
            processed_rows pr
            INNER JOIN competitor_mapping cm 
                ON pr.competitor_display_name = cm.frontend_display_name
    ),
    aggregated_prices AS (
        SELECT 
            product_id,
            store_id,
            segment_id,
            CASE 
                WHEN array_length(%s_bucket, 1) = 1 THEN MAX(competitor_price)
                WHEN %s_mode = 'Average' THEN AVG(competitor_price)
                WHEN %s_mode = 'Minimum' THEN MIN(competitor_price)
                WHEN %s_mode = 'Maximum' THEN MAX(competitor_price)
                WHEN %s_mode = 'Median' THEN percentile_cont(0.5) WITHIN GROUP (ORDER BY competitor_price)
                WHEN %s_mode = 'Mode' THEN MODE() WITHIN GROUP (ORDER BY competitor_price)
                ELSE NULL
            END AS %s_price
        FROM
            mapped_competitors
        WHERE
            competitor_price IS NOT NULL
        GROUP BY
            product_id,
            store_id,
            segment_id,
            %s_mode,
            array_length(%s_bucket, 1)
    )
SELECT 
    fb.product_id,
    fb.store_id,
    fb.segment_id,
    fb.%s_bucket,
    fb.%s_mode,
    ap.%s_price
FROM
    filtered_base fb
    LEFT JOIN aggregated_prices ap
        ON fb.product_id = ap.product_id
        AND fb.store_id = ap.store_id
        AND fb.segment_id = ap.segment_id
WHERE
    ap.%s_price IS NOT NULL;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_bucket_data_%s_%s_id1
    ON base_pricing_restaurant.temp_strategy_pre_processing_bucket_data_%s_%s (product_id, store_id, segment_id);
$query$,
    -- TABLE
    bucket_record.bucket_name,
    strategy_id,
    bucket_record.bucket_name,
    strategy_id,           
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    competitor_columns,
    strategy_id,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    competitor_case_statement,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    bucket_record.bucket_name,
    -- INDEX
    bucket_record.bucket_name,
    strategy_id,
    bucket_record.bucket_name,
    strategy_id   
);
        RAISE NOTICE 'Creating temp_strategy_pre_processing_bucket_data_%_% table - %', bucket_record.bucket_name, strategy_id, sql_query;
        EXECUTE sql_query;
    END LOOP;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_bucket_data tables for strategy %s : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_bucket_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;
