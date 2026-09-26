--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_create_bp_product_store_attributes_mapping_v3 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_create_bp_product_store_attributes_mapping_v3

DROP PROCEDURE IF EXISTS base_pricing.sp_create_bp_product_store_attributes_mapping_v3;

CREATE OR REPLACE PROCEDURE base_pricing.sp_create_bp_product_store_attributes_mapping_v3()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _sql text;
    p_k text;
    tn text;
    _worker text;
    _cols text;
    _select text;
BEGIN
    -- Step 1: Cleanup target table asynchronously
    SELECT async_query INTO _worker 
    FROM public.async_query('DELETE FROM base_pricing.bp_product_store_attributes_mapping_v4');
    PERFORM public.async_query_status(_worker, 'cleanup');

    -- Step 2: Get primary key info for parallel insert
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

    -- Step 3: Build dynamic column list & select expressions from metadata
    SELECT 
        string_agg(database_column, ', ' ORDER BY attribute_id) AS columns,
        string_agg(
            CASE 
                WHEN attribute_name = 'total_inventory' THEN 'blsig.total_inventory AS ' || database_column
                WHEN attribute_name = 'zone_exception' THEN 'false AS ' || database_column
                ELSE 'bpsm.' || attribute_name || ' AS ' || database_column
            END, 
            ', ' ORDER BY attribute_id
        ) AS select_expr
    INTO 
        _cols, _select
    FROM 
        base_pricing.bp_product_store_attributes_metadata
    WHERE 
        database_column IS NOT NULL;

    -- Step 4: Construct the dynamic SQL with {where} placeholder 
    _sql := format($f$
        WITH limited_mapping AS (
            SELECT *
            FROM base_pricing.bp_product_store_mapping 
            {where}-- This ensures each chunk respects the overall limit
        ),
        rows AS (
            INSERT INTO base_pricing.bp_product_store_attributes_mapping_v4 (
                product_id,
                store_id,
                segment_id,
                channel_id,
                zone_structure,
                price_zone,
                effective_price_zone,
                updated_at,
                %s
            )
            SELECT
                bpsm.product_id,
                bpsm.store_id,
                bpsm.segment_id,
                bpsm.channel_id,
                NULL AS zone_structure,
                NULL AS price_zone,
                NULL AS effective_price_zone,
                CURRENT_TIMESTAMP AS updated_at,
                %s
            FROM limited_mapping bpsm
            LEFT JOIN base_pricing.bp_latest_inventory_agg blsig 
                ON bpsm.product_id = blsig.product_id 
                AND bpsm.store_id = blsig.store_id
            ON CONFLICT DO NOTHING
            RETURNING 1
        )
        SELECT count(1) FROM rows;
    $f$, _cols, _select);

    -- Step 5: Execute parallel insert
    PERFORM public.parellel_insert(
        _sql,                     -- dynamic SQL
        50,                       -- concurrency
        tn,                       -- full table name
        'product_id',             -- partition column
        p_k,                      -- primary key constraint name
        500                       -- chunk size
    );

END;
$procedure$
;