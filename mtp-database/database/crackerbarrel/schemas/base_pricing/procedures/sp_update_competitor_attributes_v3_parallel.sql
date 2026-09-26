--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_update_competitor_attributes_v3_parallel stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_update_competitor_attributes_v3_parallel

DROP PROCEDURE IF EXISTS base_pricing.sp_update_competitor_attributes_v3_parallel;

CREATE OR REPLACE PROCEDURE base_pricing.sp_update_competitor_attributes_v3_parallel()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _rec RECORD;
    _sql TEXT;
    _full_sql TEXT;
    p_k TEXT;
    tn TEXT;
BEGIN
    -- Step 1: Get primary key info for parallel insert
    SELECT
        tc.constraint_name,
        concat(tc.table_schema, '.', tc.table_name) AS tn
    INTO
        p_k, tn
    FROM
        information_schema.table_constraints tc
    WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = 'bp_product_store_attributes_mapping_v4'
        AND tc.table_schema = 'base_pricing';

    -- Step 2: Loop through active competitor attributes
    FOR _rec IN
        SELECT database_column, LOWER(TRIM(attribute_name)) AS competitor_name
        FROM base_pricing.bp_competitor_attributes_metadata
        WHERE is_active = TRUE
        ORDER BY attribute_id
    LOOP
        -- Build dynamic update SQL for this attribute
        _sql := format($f$
            UPDATE base_pricing.bp_product_store_attributes_mapping_v4 AS v3
            SET %I = comp.comp_base_price
            FROM base_pricing.bp_competitor_attributes AS comp
            WHERE v3.product_id = comp.product_id
              AND v3.store_id = comp.store_id
              AND v3.segment_id = 10001
              AND LOWER(TRIM(comp.competitor)) = %L
            RETURNING v3.product_id, v3.store_id
        $f$, _rec.database_column, _rec.competitor_name);

        -- Wrap in parallel_insert for chunked, parallel execution
        _full_sql := format($f$
            WITH rows AS (
                %s
            )
            SELECT count(1) AS cnt FROM rows;
        $f$, _sql);

        PERFORM public.parellel_insert(
            _full_sql,
            50,                       -- concurrency
            tn,                       -- full table name
            'product_id',             -- partition column
            p_k,                      -- primary key constraint
            500                       -- chunk size
        );

        RAISE NOTICE 'Updated column % for competitor %', _rec.database_column, _rec.competitor_name;
    END LOOP;

    RAISE NOTICE 'All competitor attributes updated in parallel!';
END;
$procedure$
;