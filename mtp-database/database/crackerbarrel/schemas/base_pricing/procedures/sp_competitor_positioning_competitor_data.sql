--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_competitor_positioning_competitor_data stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_competitor_positioning_competitor_data

DROP PROCEDURE IF EXISTS base_pricing.sp_competitor_positioning_competitor_data;

CREATE OR REPLACE PROCEDURE base_pricing.sp_competitor_positioning_competitor_data(IN cost_column text, IN price_column text, IN eligibility_column text, IN zone_exception_column text, IN residential_segment_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    competitor_columns_select text;
    competitor_columns_lateral text;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    -- Build competitor columns dynamically from metadata
    SELECT STRING_AGG(database_column, ', ')
    INTO competitor_columns_select
    FROM base_pricing.bp_competitor_attributes_metadata
    WHERE
        is_active = true
        AND database_column IS NOT NULL
        AND database_column != '';
    -- Build VALUES clause for CROSS JOIN LATERAL (optimized unpivoting)
    SELECT STRING_AGG(
        format('(%L, bd.%I)', database_column, database_column),
        ', '
    )
    INTO competitor_columns_lateral
    FROM base_pricing.bp_competitor_attributes_metadata
    WHERE
        is_active = true
        AND database_column IS NOT NULL
        AND database_column != '';
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS temp_competitor_positioning_competitor_data_raw;
CREATE TEMP TABLE temp_competitor_positioning_competitor_data_raw AS
WITH
    segment_lookup AS (
        SELECT
            bcsm.segment_id,
            bcsm.segment_name
        FROM base_pricing.bp_customer_segment_master bcsm
        WHERE bcsm.segment_id = %s      -- residential segment
    ),
    competitor_data_raw AS (
        SELECT
            psam.product_id,
            psam.store_id,
            psam.segment_id,
            sl.segment_name,
            psam.price_zone,
            CASE
                WHEN %s IS TRUE
                    THEN psam.store_id::TEXT
                ELSE psam.effective_price_zone
                END as effective_price_zone,
            ROUND(%s::NUMERIC, 2) AS %s,        -- cost column
            ROUND(%s::NUMERIC, 2) AS %s,        -- price column
            %s      -- competitor columns select
        FROM
            base_pricing.bp_product_store_attributes_mapping_v4 psam
            INNER JOIN segment_lookup sl
                USING(segment_id)
        WHERE
            psam.%s <> 'N'::text
        ),
    unpivoted_competitors AS (
        SELECT
            bd.product_id,
            bd.store_id,
            bd.segment_id,
            bd.segment_name,
            bd.price_zone,
            bd.effective_price_zone,
            bd.%s,      -- cost column
            bd.%s,      -- price column
            bcam.attribute_name AS competitor_name,
            bcam.frontend_display_name AS competitor_display_name,
            ROUND(comp.competitor_price::NUMERIC, 2) AS competitor_price
        FROM
            competitor_data_raw bd
            CROSS JOIN LATERAL (
                VALUES
                    %s      -- competitor columns lateral
                ) AS comp(column_name, competitor_price)
            INNER JOIN base_pricing.bp_competitor_attributes_metadata bcam
                ON bcam.database_column::text = comp.column_name AND bcam.is_active = true
        WHERE comp.competitor_price IS NOT NULL
    )
SELECT *
FROM unpivoted_competitors;
-- INDEX creation
CREATE INDEX idx_temp_competitor_positioning_competitor_data_raw_id1
    ON temp_competitor_positioning_competitor_data_raw USING btree (product_id, store_id, competitor_name);
-- TABLE creation
DROP TABLE IF EXISTS temp_competitor_positioning_competitor_data;
CREATE TEMP TABLE temp_competitor_positioning_competitor_data AS
WITH
    competitor_pricing_with_percentage AS (
        SELECT
            uc.product_id,
            uc.store_id,
            uc.segment_id,
            uc.segment_name,
            uc.price_zone,
            uc.effective_price_zone,
            uc.%s,      -- cost column
            uc.%s,      -- price column
            uc.competitor_price,
            uc.competitor_name,
            uc.competitor_display_name,
            CASE
                WHEN uc.competitor_price = 0
                    THEN NULL::NUMERIC
                ELSE (uc.%s - uc.competitor_price)
                END AS price_difference_raw,
            CASE
                WHEN uc.competitor_price = 0
                    THEN NULL::NUMERIC
                ELSE ROUND((((uc.%s - uc.competitor_price) / uc.competitor_price) * 100)::NUMERIC, 2)
                END AS price_difference_percent_raw,
            CASE
                WHEN uc.competitor_price = 0
                    THEN 'No Data'::text
                WHEN uc.%s > uc.competitor_price
                    THEN 'Higher'::text
                WHEN uc.%s < uc.competitor_price
                    THEN 'Lower'::text
                ELSE 'Similar'::text
                END AS price_category
           FROM temp_competitor_positioning_competitor_data_raw uc
        )
SELECT
    *,
    ABS(price_difference_raw) as price_difference,
    ABS(price_difference_percent_raw) as price_difference_percent
FROM
    competitor_pricing_with_percentage
WHERE
    price_difference_raw IS NOT NULL;
-- INDEX creation
CREATE INDEX idx_temp_competitor_positioning_competitor_data_id1
    ON temp_competitor_positioning_competitor_data USING btree (product_id, store_id, competitor_name);
$query$,
    residential_segment_id,
    zone_exception_column,
    cost_column,
    cost_column,
    price_column,
    price_column,
    competitor_columns_select,
    eligibility_column,
    cost_column,
    price_column,
    competitor_columns_lateral,
    cost_column,
    price_column,
    price_column,
    price_column,
    price_column,
    price_column
);
    RAISE NOTICE 'Creating temp_competitor_positioning_competitor_data table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_competitor_positioning_competitor_data table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_competitor_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;