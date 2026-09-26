--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_pre_processing_bucket_combine stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_pre_processing_bucket_combine

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_pre_processing_bucket_combine;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_pre_processing_bucket_combine(IN strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text := '';
    bucket_record RECORD;
    bucket_column_selection text := '';
    bucket_join_statement text := '';
BEGIN
    start_time := clock_timestamp();
    -- Build dynamic bucket column list
    FOR bucket_record IN 
        SELECT bucket_name
        FROM base_pricing_restaurant.bp_bucket_config
        WHERE is_active IS TRUE
    LOOP
        -- for SELECT
        bucket_column_selection := bucket_column_selection || format(
    ',
    %s_bucket,
    %s_mode,
    %s_price'
            , bucket_record.bucket_name
            , bucket_record.bucket_name
            , bucket_record.bucket_name
        );
        -- For join
        bucket_join_statement := bucket_join_statement || format(
                '
    FULL OUTER JOIN base_pricing_restaurant.temp_strategy_pre_processing_bucket_data_%s_%s
        USING(product_id, store_id, segment_id)'
                , bucket_record.bucket_name
                , strategy_id
        );
    END LOOP;
    -- Bucket combination query
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_pre_processing_bucket_combine_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_strategy_pre_processing_bucket_combine_%s AS
SELECT
    product_id,
    store_id,
    segment_id
    -- Dynamic bucket columns
    %s
FROM (
    SELECT
        null::int4 as product_id,
        null::int4 as store_id,
        null::int4 as segment_id
    ) AS null_check %s
WHERE
    product_id IS NOT NULL;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_bucket_combine_%s_id1
    ON base_pricing_restaurant.temp_strategy_pre_processing_bucket_combine_%s (product_id, store_id, segment_id);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    bucket_column_selection,
    bucket_join_statement,
    -- INDEX
    strategy_id,
    strategy_id   
);
    RAISE NOTICE 'Creating temp_strategy_pre_processing_bucket_combine_%s table - %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_bucket_combine_%s : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_bucket_combine', start_time, end_time, end_time - start_time);
END;
$procedure$
;