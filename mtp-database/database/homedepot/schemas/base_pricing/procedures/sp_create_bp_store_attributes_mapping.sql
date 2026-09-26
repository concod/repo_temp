--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_create_bp_store_attributes_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sp_create_bp_store_attributes_mapping_v1

DROP PROCEDURE IF EXISTS base_pricing.sp_create_bp_store_attributes_mapping();

CREATE OR REPLACE PROCEDURE base_pricing.sp_create_bp_store_attributes_mapping()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _sql text;
    p_k text;
    tn text;
    _worker text;
BEGIN
    -- Step 1: Cleanup existing records asynchronously
    SELECT async_query INTO _worker 
    FROM public.async_query('DELETE FROM base_pricing.bp_store_attributes_mapping');
    PERFORM public.async_query_status(_worker, 'cleanup');

    -- Step 2: Get primary key constraint and table name for bp_store_master
    SELECT
        tc.constraint_name,
        concat(tc.table_schema, '.', tc.table_name) AS tn
    INTO
        p_k, tn
    FROM
        information_schema.table_constraints tc
    WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = 'bp_store_master'
        AND tc.table_schema = 'base_pricing';

    -- Step 3: Construct dynamic SQL with {where} placeholder
    _sql := 'WITH rows AS (
        INSERT INTO base_pricing.bp_store_attributes_mapping (
            store_id,
            attributes,
            updated_at
        )
        SELECT
            bsm.store_id,
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
                                ELSE
                                    jsonb_build_object(
                                        ''current'', CASE 
                                            WHEN jsonb_typeof(to_jsonb(bsm) -> pam.attribute_name) = ''string'' 
                                            THEN to_jsonb(LOWER(TRIM(BOTH ''"'' FROM (to_jsonb(bsm) -> pam.attribute_name)::text)))
                                            ELSE to_jsonb(bsm) -> pam.attribute_name
                                        END,
                                        ''initial'', CASE 
                                            WHEN jsonb_typeof(to_jsonb(bsm) -> pam.attribute_name) = ''string'' 
                                            THEN to_jsonb(LOWER(TRIM(BOTH ''"'' FROM (to_jsonb(bsm) -> pam.attribute_name)::text)))
                                            ELSE to_jsonb(bsm) -> pam.attribute_name
                                        END
                                    )
                            END
                    )
                    ORDER BY pam.attribute_id
                )
                FROM base_pricing.bp_store_attributes_metadata pam
                WHERE pam.is_active = TRUE
            ) AS attributes,
            CURRENT_TIMESTAMP AS updated_at
        FROM (SELECT * FROM base_pricing.bp_store_master {where}) bsm
        LEFT JOIN base_pricing.bp_latest_store_inventory_agg blsig
            ON bsm.store_id = blsig.store_id
        ON CONFLICT DO NOTHING
        RETURNING 1
    )
    SELECT count(1) FROM rows;';

    -- Step 4: Launch parallel insert
    PERFORM public.parellel_insert(
        _sql,                      -- query
        50,                        -- concurrency
        tn,                        -- table name (e.g., base_pricing.bp_store_master)
        'store_id',                -- partition column
        p_k,                       -- primary key index (e.g., bp_store_master_pkey)
        500                        -- chunk size
    );
END;
$procedure$
;
