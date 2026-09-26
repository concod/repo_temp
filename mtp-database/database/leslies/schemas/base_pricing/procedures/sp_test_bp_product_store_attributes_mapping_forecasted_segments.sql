--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_test_bp_product_store_attributes_mapping_forecasted_segments_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_test_bp_product_store_attributes_mapping_forecasted_segments_10

DROP PROCEDURE IF EXISTS base_pricing.sp_test_bp_product_store_attributes_mapping_forecasted_segments;

CREATE OR REPLACE PROCEDURE base_pricing.sp_test_bp_product_store_attributes_mapping_forecasted_segments()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _sql    text;
    p_k     text;
    tn      text;
BEGIN
    -- Step 1: Get primary key constraint and table name for bp_product_store_mapping
    SELECT
        tc.constraint_name,
        concat(tc.table_schema, '.', tc.table_name) AS tn
    INTO
        p_k, tn
    FROM
        information_schema.table_constraints tc
    WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = 'bp_product_store_mapping'
        AND tc.table_schema = 'base_pricing';

    -- Step 2: Build dynamic SQL query with filters
    _sql := 'WITH rows AS (
        INSERT INTO base_pricing.bp_product_store_attributes_mapping (
            product_id,
            store_id,
            segment_id,
            attributes,
            updated_at,
            zone_structure,
            price_zone,
            channel_id,
            effective_price_zone
        )
        SELECT
            bpsm.product_id,
            bpsm.store_id,
            bpsm.segment_id,
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        ''attribute_name'', pam.attribute_name,
                        ''attribute_value'',
                            CASE
                                WHEN pam.attribute_name = ''total_inventory'' THEN
                                    jsonb_build_object(
                                        ''current'', blsig.total_inventory,
                                        ''initial'', blsig.total_inventory
                                    )
                                WHEN pam.attribute_name = ''zone_exception'' THEN
                                    jsonb_build_object(
                                        ''current'', false,
                                        ''initial'', false
                                    )
                                ELSE
                                    jsonb_build_object(
                                        ''current'', CASE 
                                            WHEN jsonb_typeof(to_jsonb(bpsm) -> pam.attribute_name) = ''string''
                                            THEN to_jsonb(UPPER(TRIM(BOTH ''"'' FROM (to_jsonb(bpsm) -> pam.attribute_name)::text)))
                                            ELSE to_jsonb(bpsm) -> pam.attribute_name
                                        END,
                                        ''initial'', CASE 
                                            WHEN jsonb_typeof(to_jsonb(bpsm) -> pam.attribute_name) = ''string''
                                            THEN to_jsonb(UPPER(TRIM(BOTH ''"'' FROM (to_jsonb(bpsm) -> pam.attribute_name)::text)))
                                            ELSE to_jsonb(bpsm) -> pam.attribute_name
                                        END
                                    )
                            END
                    )
                    ORDER BY pam.attribute_id
                )
                FROM base_pricing.bp_product_store_attributes_metadata pam
            ) AS attributes,
            CURRENT_TIMESTAMP AS updated_at,
            NULL AS zone_structure,
            NULL AS price_zone,
            bpsm.channel_id,
            NULL AS effective_price_zone
        FROM (
            SELECT * 
            FROM base_pricing.bp_product_store_mapping bpsm
            WHERE price IS NOT NULL
              AND segment_id > 10003
              AND product_id IN (
                  18834,18835,15975,15976,15991,400602,400601,18766,18767,18856,
                  14069,81292,18800,18801,18802,18803,18775,18776,20450,21451,
                  82627,82629,20465,20735,21452,82628,20144,18791,18793,18790,
                  18792,18794,70066,18831,236870,18832,14699,20795,48775,20870,
                  16470,14513,18836,14224,20260
              )
              AND product_id IN (SELECT product_id FROM base_pricing.bp_simulation_week_alt)
            ORDER BY product_id
        ) bpsm
        LEFT JOIN base_pricing.bp_latest_inventory_agg blsig 
            ON bpsm.product_id = blsig.product_id 
            AND bpsm.store_id = blsig.store_id
        ON CONFLICT DO NOTHING
        RETURNING 1
    )
    SELECT count(1) FROM rows;';

    -- Step 3: Execute parallel insert
    PERFORM public.parellel_insert(
        _sql,                     -- dynamic SQL
        50,                       -- concurrency
        tn,                       -- full table name (bp_product_store_mapping)
        'product_id',             -- partition column
        p_k,                      -- primary key constraint name
        500                       -- chunk size
    );
END;
$procedure$
;