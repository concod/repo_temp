--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_test_bp_product_store_attributes_mapping_forecasted_leftover_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_test_bp_product_store_attributes_mapping_forecasted_leftover_10

DROP PROCEDURE IF EXISTS base_pricing.sp_test_bp_product_store_attributes_mapping_forecasted_leftover;

CREATE OR REPLACE PROCEDURE base_pricing.sp_test_bp_product_store_attributes_mapping_forecasted_leftover()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _sql    text;
    p_k     text;
    tn      text;
    _worker text;
BEGIN

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

    -- Step 3: Build dynamic SQL query template with product list filter
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
            bpsm.segment_id,  -- keep segment_id from source table
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
        FROM base_pricing.bp_product_store_mapping bpsm
        LEFT JOIN base_pricing.bp_latest_inventory_agg blsig 
            ON bpsm.product_id = blsig.product_id 
            AND bpsm.store_id = blsig.store_id
        WHERE bpsm.product_id IN (
            12078,18772,18771,12077,18770,409917,18774,18773,14324,18783,18750,18752,18756,14015,14239,14245,18746,18748,18763,18749,
            18764,409754,14069,12085,18766,12086,18767,18768,12082,18776,18775,18777,12080,404573,18800,18802,18801,12079,18803,18790,
            18792,12096,12095,18794,12097,12093,18793,12092,12091,18791,18785,16470,14699,18781,18782,12084,18779,12083,18780,14513,
            18836,14224,12073,18739,18743,12074,13450,12072,12071,18787,14915,18786
        )
        AND bpsm.segment_id = 10001
        ON CONFLICT DO NOTHING
        RETURNING 1
    )
    SELECT count(1) FROM rows;';

    -- Step 4: Execute parallel insert
    PERFORM public.parellel_insert(
        _sql,
        50,     -- concurrency
        tn,     -- table name
        'product_id',
        p_k,
        500     -- chunk size
    );
END;
$procedure$
;