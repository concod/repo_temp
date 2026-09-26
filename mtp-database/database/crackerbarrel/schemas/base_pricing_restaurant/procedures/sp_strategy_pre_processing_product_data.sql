--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_pre_processing_product_data_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_pre_processing_product_data_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_pre_processing_product_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_pre_processing_product_data(IN strategy_id integer)
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
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_pre_processing_product_data_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_strategy_pre_processing_product_data_%s AS
SELECT 
    bpam.product_id,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'line_group'
        LIMIT 1
    ) AS line_group,
    (
        SELECT (elem->'attribute_value'->>'current')::boolean
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'pre_price'
        LIMIT 1
    ) AS pre_price,
    (
        SELECT (elem->'attribute_value'->>'current')::date
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'launch_date'
        LIMIT 1
    ) AS launch_date,
    (
        SELECT (elem->'attribute_value'->>'current')::numeric
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'size'
        LIMIT 1
    ) AS size,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'uom'
        LIMIT 1
    ) AS uom,
    (
        SELECT (elem->'attribute_value'->>'current')::numeric
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'derived_size'
        LIMIT 1
    ) AS derived_size,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'derived_uom'
        LIMIT 1
    ) AS derived_uom,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'brand_family'
        LIMIT 1
    ) AS brand_family,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'brand_class'
        LIMIT 1
    ) AS brand_class,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'size_family'
        LIMIT 1
    ) AS size_family,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'size_class'
        LIMIT 1
    ) AS size_class,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'custom_family_1'
        LIMIT 1
    ) AS custom_family_1,
    (
        SELECT (elem->'attribute_value'->>'current')::text
        FROM jsonb_array_elements(bpam.attributes) AS elem
        WHERE elem->>'attribute_name' = 'custom_class_1'
        LIMIT 1
    ) AS custom_class_1
FROM (
        SELECT DISTINCT product_id
        FROM base_pricing_restaurant.bp_strategy_products_stores
        WHERE strategy_id = %s
    ) AS bsp
    INNER JOIN base_pricing_restaurant.bp_product_master bpm
        ON bsp.product_id = bpm.product_id
    INNER JOIN base_pricing_restaurant.bp_product_attributes_mapping bpam
        ON bpm.product_id = bpam.product_id
WHERE
    bpm.usable IS TRUE;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_product_data_%s_id1
    ON base_pricing_restaurant.temp_strategy_pre_processing_product_data_%s USING btree (product_id);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    strategy_id,
    -- INDEX
    strategy_id,
    strategy_id
);
    RAISE NOTICE 'Creating temp_strategy_pre_processing_product_data_% - %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_product_data_% : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_product_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;