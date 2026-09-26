--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_passive_final_prices_main runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_passive_final_prices_main

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_passive_final_prices_main;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_passive_final_prices_main()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE 'STARTING Update Passive Final Prices';
    sql_query := format(
$query$
-- STEP 1
DROP TABLE IF EXISTS temp_products_active;
CREATE TEMP TABLE temp_products_active AS
SELECT
    bpm.product_id
FROM
    base_pricing_restaurant.bp_product_master bpm
WHERE
    active IS TRUE AND usable IS TRUE;
CREATE INDEX idx_temp_products_active_id1
    ON temp_products_active (product_id);
-- STEP 2
DROP TABLE IF EXISTS temp_products_inactive;
CREATE TEMP TABLE temp_products_inactive AS
SELECT
    bpm.product_id
FROM
    base_pricing_restaurant.bp_product_master bpm
WHERE
    active IS FALSE OR usable IS FALSE;
CREATE INDEX idx_temp_products_inactive_id1
    ON temp_products_inactive (product_id);
-- STEP 3
DROP TABLE IF EXISTS temp_products_active_data;
CREATE TEMP TABLE temp_products_active_data AS
SELECT
    bpam.product_id,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'line_group'
    )::text AS line_group,
    -- FINAL PRICES
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'residential_price_final'
        )::numeric AS residential_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c1_price_final'
        )::numeric AS c1_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c2_price_final'
        )::numeric AS c2_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c3_price_final'
        )::numeric AS c3_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c4_price_final'
        )::numeric AS c4_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c5_price_final'
    )::numeric AS c5_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c6_price_final'
    )::numeric AS c6_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c7_price_final'
    )::numeric AS c7_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c8_price_final'
        )::numeric AS c8_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c9_price_final'
    )::numeric AS c9_price_final
FROM
    base_pricing_restaurant.bp_product_attributes_mapping_v2 bpam
    INNER JOIN temp_products_active bpm
        USING (product_id);
CREATE INDEX idx_temp_products_active_data_id1
    ON temp_products_active_data (product_id);
CREATE INDEX idx_temp_products_active_data_id2
    ON temp_products_active_data (line_group);
-- STEP 4
DROP TABLE IF EXISTS temp_products_inactive_data_raw;
CREATE TEMP TABLE temp_products_inactive_data_raw AS
SELECT
    bpam.product_id,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'line_group'
    )::text AS line_group,
    -- FINAL PRICES
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'residential_price_final'
        )::numeric AS residential_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c1_price_final'
        )::numeric AS c1_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c2_price_final'
        )::numeric AS c2_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c3_price_final'
        )::numeric AS c3_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c4_price_final'
        )::numeric AS c4_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c5_price_final'
    )::numeric AS c5_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c6_price_final'
    )::numeric AS c6_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c7_price_final'
    )::numeric AS c7_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c8_price_final'
        )::numeric AS c8_price_final,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c9_price_final'
    )::numeric AS c9_price_final,
    -- SOURCE PRICES
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'residential_price'
        )::numeric AS residential_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c1_price'
        )::numeric AS c1_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c2_price'
        )::numeric AS c2_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c3_price'
        )::numeric AS c3_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c4_price'
        )::numeric AS c4_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c5_price'
    )::numeric AS c5_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c6_price'
    )::numeric AS c6_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c7_price'
    )::numeric AS c7_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c8_price'
        )::numeric AS c8_price_source,
    (SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'c9_price'
    )::numeric AS c9_price_source,
    -- Check locks
    COALESCE((
        SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'pre_price'
    )::boolean, false)::boolean AS pre_price,
    COALESCE((
        SELECT attr->'attribute_value'->>'current'
        FROM jsonb_array_elements(bpam.attributes) AS attr
        WHERE attr->>'attribute_name' = 'price_freeze'
    )::boolean, false)::boolean AS price_freeze
FROM
    base_pricing_restaurant.bp_product_attributes_mapping_v2 bpam
    INNER JOIN temp_products_inactive bpm
        USING (product_id);
-- STEP 5
DROP TABLE IF EXISTS temp_products_inactive_data;
CREATE TEMP TABLE temp_products_inactive_data AS
SELECT
    product_id,
    line_group,
    pre_price,
    price_freeze,
    -- FINAL PRICES
    CASE WHEN pre_price = TRUE
        THEN residential_price_source
        ELSE residential_price_final
        END AS residential_price_final,
    CASE WHEN pre_price = TRUE
        THEN c1_price_source
        ELSE c1_price_final
        END AS c1_price_final,
    CASE WHEN pre_price = TRUE
        THEN c2_price_source
        ELSE c2_price_final
        END AS c2_price_final,
    CASE WHEN pre_price = TRUE
        THEN c3_price_source
        ELSE c3_price_final
        END AS c3_price_final,
    CASE WHEN pre_price = TRUE
        THEN c4_price_source
        ELSE c4_price_final
        END AS c4_price_final,
    CASE WHEN pre_price = TRUE
        THEN c5_price_source
        ELSE c5_price_final
        END AS c5_price_final,
    CASE WHEN pre_price = TRUE
        THEN c6_price_source
        ELSE c6_price_final
        END AS c6_price_final,
    CASE WHEN pre_price = TRUE
        THEN c7_price_source
        ELSE c7_price_final
        END AS c7_price_final,
    CASE WHEN pre_price = TRUE
        THEN c8_price_source
        ELSE c8_price_final
        END AS c8_price_final,
    CASE WHEN pre_price = TRUE
        THEN c9_price_source
        ELSE c9_price_final
        END AS c9_price_final,
    -- SOURCE PRICES
    residential_price_source,
    c1_price_source,
    c2_price_source,
    c3_price_source,
    c4_price_source,
    c5_price_source,
    c6_price_source,
    c7_price_source,
    c8_price_source,
    c9_price_source
FROM
    temp_products_inactive_data_raw tpidr;
CREATE INDEX idx_temp_products_inactive_data_id1
    ON temp_products_inactive_data (product_id);
CREATE INDEX idx_temp_products_inactive_data_id2
    ON temp_products_inactive_data (line_group);
-- STEP 6
DROP TABLE IF EXISTS temp_products_active_data_lg;
CREATE TEMP TABLE temp_products_active_data_lg AS
SELECT
    line_group,
    -- FINAL PRICES
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY residential_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY residential_price_final),
        AVG(residential_price_final)
    ) AS residential_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c1_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c1_price_final),
        AVG(c1_price_final)
    ) AS c1_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c2_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c2_price_final),
        AVG(c2_price_final)
    ) AS c2_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c3_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c3_price_final),
        AVG(c3_price_final)
    ) AS c3_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c4_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c4_price_final),
        AVG(c4_price_final)
    ) AS c4_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c5_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c5_price_final),
        AVG(c5_price_final)
    ) AS c5_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c6_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c6_price_final),
        AVG(c6_price_final)
    ) AS c6_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c7_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c7_price_final),
        AVG(c7_price_final)
    ) AS c7_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c8_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c8_price_final),
        AVG(c8_price_final)
    ) AS c8_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c9_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c9_price_final),
        AVG(c9_price_final)
    ) AS c9_price_final_lg
FROM
    temp_products_active_data
WHERE
    line_group IS NOT NULL
    OR line_group <> ''
GROUP BY
    line_group;
CREATE INDEX idx_temp_products_active_data_lg_id1
    ON temp_products_active_data_lg (line_group);
-- STEP 7
DROP TABLE IF EXISTS temp_products_inactive_data_lg;
CREATE TEMP TABLE temp_products_inactive_data_lg AS
SELECT
    line_group,
    -- FINAL PRICES
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY residential_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY residential_price_final),
        AVG(residential_price_final)
    ) AS residential_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c1_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c1_price_final),
        AVG(c1_price_final)
    ) AS c1_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c2_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c2_price_final),
        AVG(c2_price_final)
    ) AS c2_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c3_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c3_price_final),
        AVG(c3_price_final)
    ) AS c3_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c4_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c4_price_final),
        AVG(c4_price_final)
    ) AS c4_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c5_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c5_price_final),
        AVG(c5_price_final)
    ) AS c5_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c6_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c6_price_final),
        AVG(c6_price_final)
    ) AS c6_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c7_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c7_price_final),
        AVG(c7_price_final)
    ) AS c7_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c8_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c8_price_final),
        AVG(c8_price_final)
    ) AS c8_price_final_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c9_price_final),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c9_price_final),
        AVG(c9_price_final)
    ) AS c9_price_final_lg,
    -- SOURCE PRICES
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY residential_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY residential_price_source),
        AVG(residential_price_source)
    ) AS residential_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c1_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c1_price_source),
        AVG(c1_price_source)
    ) AS c1_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c2_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c2_price_source),
        AVG(c2_price_source)
    ) AS c2_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c3_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c3_price_source),
        AVG(c3_price_source)
    ) AS c3_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c4_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c4_price_source),
        AVG(c4_price_source)
    ) AS c4_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c5_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c5_price_source),
        AVG(c5_price_source)
    ) AS c5_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c6_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c6_price_source),
        AVG(c6_price_source)
    ) AS c6_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c7_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c7_price_source),
        AVG(c7_price_source)
    ) AS c7_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c8_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c8_price_source),
        AVG(c8_price_source)
    ) AS c8_price_source_lg,
    COALESCE(
        MODE() WITHIN GROUP (ORDER BY c9_price_source),
        percentile_cont(0.5) WITHIN GROUP (ORDER BY c9_price_source),
        AVG(c9_price_source)
    ) AS c9_price_source_lg
FROM
    temp_products_inactive_data
WHERE
    line_group IS NOT NULL
    OR line_group <> ''
GROUP BY
    line_group;
CREATE INDEX idx_temp_products_inactive_data_lg_id1
    ON temp_products_inactive_data_lg (line_group);
-- STEP 8
DROP TABLE IF EXISTS temp_products_inactive_data_updated;
CREATE TEMP TABLE temp_products_inactive_data_updated AS
SELECT
    pid.product_id,
    pid.line_group,
    pid.pre_price,
    pid.price_freeze,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pid.residential_price_final
        ELSE COALESCE(
                padl.residential_price_final_lg,
                pidl.residential_price_final_lg,
                pidl.residential_price_source_lg,
                pid.residential_price_final,
                pid.residential_price_source
        ) END AS residential_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
            THEN pid.c1_price_final
        ELSE COALESCE(
                padl.c1_price_final_lg,
                pidl.c1_price_final_lg,
                pidl.c1_price_source_lg,
                pid.c1_price_final,
                pid.c1_price_source
        ) END AS c1_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
            THEN pid.c2_price_final
        ELSE COALESCE(
                padl.c2_price_final_lg,
                pidl.c2_price_final_lg,
                pidl.c2_price_source_lg,
                pid.c2_price_final,
                pid.c2_price_source
        ) END AS c2_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pid.c3_price_final
        ELSE COALESCE(
                padl.c3_price_final_lg,
                pidl.c3_price_final_lg,
                pidl.c3_price_source_lg,
                pid.c3_price_final,
                pid.c3_price_source
        ) END AS c3_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pid.c4_price_final
        ELSE COALESCE(
                padl.c4_price_final_lg,
                pidl.c4_price_final_lg,
                pidl.c4_price_source_lg,
                pid.c4_price_final,
                pid.c4_price_source
        ) END AS c4_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pid.c5_price_final
        ELSE COALESCE(
                padl.c5_price_final_lg,
                pidl.c5_price_final_lg,
                pidl.c5_price_source_lg,
                pid.c5_price_final,
                pid.c5_price_source
        ) END AS c5_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pid.c6_price_final
        ELSE COALESCE(
                padl.c6_price_final_lg,
                pidl.c6_price_final_lg,
                pidl.c6_price_source_lg,
                pid.c6_price_final,
                pid.c6_price_source
        ) END AS c6_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pid.c7_price_final
        ELSE COALESCE(
                padl.c7_price_final_lg,
                pidl.c7_price_final_lg,
                pidl.c7_price_source_lg,
                pid.c7_price_final,
                pid.c7_price_source
        ) END AS c7_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pid.c8_price_final
        ELSE COALESCE(
                padl.c8_price_final_lg,
                pidl.c8_price_final_lg,
                pidl.c8_price_source_lg,
                pid.c8_price_final,
                pid.c8_price_source
        ) END AS c8_price_final,
    CASE WHEN pre_price = TRUE OR price_freeze = TRUE
        THEN pid.c9_price_final
        ELSE COALESCE(
                padl.c9_price_final_lg,
                pidl.c9_price_final_lg,
                pidl.c9_price_source_lg,
                pid.c9_price_final,
                pid.c9_price_source
        ) END AS c9_price_final
FROM
    temp_products_inactive_data pid
    LEFT JOIN temp_products_active_data_lg padl
        USING (line_group)
    LEFT JOIN temp_products_inactive_data_lg pidl
        USING (line_group);
CREATE INDEX idx_temp_products_inactive_data_updated_id1
    ON temp_products_inactive_data_updated (product_id);
-- STEP 9
DROP TABLE IF EXISTS base_pricing_restaurant.bp_product_attributes_mapping_backup;
CREATE TABLE base_pricing_restaurant.bp_product_attributes_mapping_backup AS (TABLE base_pricing_restaurant.bp_product_attributes_mapping_v2);
-- STEP 10
UPDATE base_pricing_restaurant.bp_product_attributes_mapping_v2 b
SET attributes = (
    SELECT jsonb_agg(
        CASE
            WHEN attr->>'attribute_name' = 'residential_price_final' AND u.residential_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.residential_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.residential_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c1_price_final' AND u.c1_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c1_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c1_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c2_price_final' AND u.c2_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c2_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c2_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c3_price_final' AND u.c3_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c3_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c3_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c4_price_final' AND u.c4_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c4_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c4_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c5_price_final' AND u.c5_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c5_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c5_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c6_price_final' AND u.c6_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c6_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c6_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c7_price_final' AND u.c7_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c7_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c7_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c8_price_final' AND u.c8_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c8_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c8_price_final), false
                )
            WHEN attr->>'attribute_name' = 'c9_price_final' AND u.c9_price_final IS NOT NULL
                THEN jsonb_set(
                    jsonb_set(attr, '{attribute_value,current}', to_jsonb(u.c9_price_final), false),
                    '{attribute_value,initial}', to_jsonb(u.c9_price_final), false
                )
            ELSE attr
        END
    )
    FROM jsonb_array_elements(b.attributes) AS attr
    JOIN temp_products_inactive_data_updated u
      ON b.product_id = u.product_id
)
WHERE EXISTS (
    SELECT 1 FROM temp_products_inactive_data_updated u WHERE b.product_id = u.product_id
);
$query$
);
    RAISE NOTICE 'FINISHED Competitor Positioning Refresh';
    end_time := clock_timestamp();
    EXECUTE sql_query;
    RAISE NOTICE 'Time taken : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_competitor_positioning_main', start_time, end_time, end_time - start_time);
END;
$procedure$
;
