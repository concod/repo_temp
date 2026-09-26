--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_insert_all_bp_product_store_mappings runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_insert_all_bp_product_store_mappings

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_insert_all_bp_product_store_mappings;

-- DROP PROCEDURE base_pricing_restaurant.sp_insert_all_bp_product_store_mappings();

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_insert_all_bp_product_store_mappings()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    tbl text;
    query text;
    p_k text;
    tn text;
    _worker text;
    row_count int;
BEGIN
    -- STEP 1: Clean up target table asynchronously before insert
    RAISE NOTICE 'Cleaning up target table: bp_product_store_mapping ...';
    SELECT async_query INTO _worker 
    FROM public.async_query('DELETE FROM base_pricing_restaurant.bp_product_store_mapping');
    PERFORM public.async_query_status(_worker, 'cleanup_done');

    -- STEP 2: Loop through child tables and insert data
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'base_pricing_restaurant'
          AND tablename LIKE 'bp_product_store_mapping_%'
          AND tablename NOT IN ('bp_product_store_mapping')
    LOOP
        -- Check if table is empty
        EXECUTE format('SELECT COUNT(1) FROM base_pricing_restaurant.%I', tbl) INTO row_count;
        IF row_count = 0 THEN
            RAISE NOTICE 'Skipping empty table: %', tbl;
            CONTINUE;
        END IF;

        RAISE NOTICE 'Processing table: %', tbl;

        -- Get primary key constraint and full table name
        SELECT
            tc.constraint_name,
            concat(tc.table_schema,'.', tc.table_name) AS tn
        INTO p_k, tn
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name = tbl
          AND tc.table_schema = 'base_pricing_restaurant';

        -- Skip table if no PK found
        IF p_k IS NULL OR tn IS NULL THEN
            RAISE NOTICE 'Skipping table % as it has no primary key.', tbl;
            CONTINUE;
        END IF;

        query := format($fmt$
            INSERT INTO base_pricing_restaurant.bp_product_store_mapping (
                product_id,
                store_id,
                segment_id,
                channel_id,
                base_cost,
                additional_cost,
                total_cost,
                price,
                price_lock,
                status,
                eligibility,
                is_kvi,
                reference_price_1,
                reference_price_2
            )
            WITH joined_data AS (
                SELECT
                    s.product_id,
                    s.store_id,
                    s.segment_id,
                    sm.s0_cid AS channel_id,
                    ROUND(attr.base_cost::numeric, 2) AS base_cost,
                    ROUND(attr.rebate::numeric, 2) AS rebate,
                    ROUND(attr.marketplace_fee::numeric, 2) AS marketplace_fee,
                    ROUND(attr.shipping_cost::numeric, 2) AS shipping_cost,
                    ROUND(s.price::numeric, 2) AS price,
                    s.price_lock,
                    pm.active AS product_active,
                    sm.active AS store_active,
                    s.is_kvi,
                    s.eligibility,
                    ROUND(s.reference_price_1::numeric, 2) AS reference_price_1,
                    ROUND(s.reference_price_2::numeric, 2) AS reference_price_2,
                    ROUND(
                        CASE 
                            WHEN sm.s0_cid IN (1, 2) THEN -COALESCE(attr.rebate, 0)
                            WHEN sm.s0_cid = 3 THEN -COALESCE(attr.rebate, 0) + COALESCE(attr.marketplace_fee, 0)
                            WHEN sm.s0_cid IN (4, 5) THEN -COALESCE(attr.rebate, 0) + COALESCE(attr.shipping_cost, 0)
                            ELSE 0
                        END::numeric, 2
                    ) AS additional_cost
                FROM (SELECT * FROM base_pricing_restaurant.%I {where}) s  
                INNER JOIN base_pricing_restaurant.bp_product_master pm ON s.product_id = pm.product_id AND pm.active = TRUE
                INNER JOIN base_pricing_restaurant.bp_store_master sm ON s.store_id = sm.store_id AND sm.active = TRUE
                INNER JOIN base_pricing_restaurant.bp_product_attributes attr ON s.product_id = attr.product_id
            )
            SELECT
                product_id,
                store_id,
                segment_id,
                channel_id,
                base_cost,
                additional_cost,
                ROUND(base_cost + additional_cost, 2) AS total_cost,
                price,
                price_lock,
                TRUE AS status,
                eligibility,
                is_kvi,
                reference_price_1,
                reference_price_2
            FROM joined_data
            WHERE price IS NOT NULL 
              AND price > 0
              AND (base_cost + additional_cost) > 0
              AND base_cost IS NOT NULL 
              AND base_cost > 0
        $fmt$, tbl);

        -- STEP 3: Execute parallel inserts per child table
        PERFORM public.parellel_insert(
            'WITH rows AS (' || query || ' RETURNING 1 ) SELECT count(1) AS cnt FROM rows;',
            50,        -- concurrency
            tn,        -- source table
            'product_id', -- partition key
            p_k,       -- PK constraint
            500        -- chunk size
        );

    END LOOP;

    RAISE NOTICE 'All child tables processed.';
END;
$procedure$
;
