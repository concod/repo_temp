--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_fetch_store_level_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_fetch_store_level_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_fetch_store_level_data ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_fetch_store_level_data(IN var_promo_id integer, IN var_week_start_date date, IN var_week_end_date date, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    var_customer_ids integer[];
    var_c0_ids integer[];
    var_scenario_key text;
    var_full_table_name text;
    var_product_filter_table text;
BEGIN
--    RAISE NOTICE '--- PROCEDURE STARTED ---';
--    RAISE NOTICE 'Input → promo_id: %s, start_date: %s, end_date: %s, scenario_ids: %s',
--        var_promo_id, var_week_start_date, var_week_end_date, arr_scenario_id;
--
--    -- Step 1: Get customer_id for the promo
--    SELECT ARRAY_AGG(DISTINCT customer_id ORDER BY customer_id) INTO var_customer_ids
--    FROM price_promo.tb_promo_customers
--    WHERE promo_id = var_promo_id;
--
--    -- Step 2: Get c0_id from global.customer_master
--    SELECT ARRAY_AGG(DISTINCT c0_id ORDER BY c0_id) INTO var_c0_ids
--    FROM global.customer_master
--    WHERE customer_id = ANY(var_customer_ids);
--
--    RAISE NOTICE 'Resolved → customer_id: %s, c0_id: %s', var_customer_ids, var_c0_ids;
--
--    -- Step 3: Build table names
--    var_scenario_key := array_to_string(arr_scenario_id, '_');
--    var_full_table_name := format('promo_simulation_store_level_data_%s_%s', var_promo_id, var_scenario_key);
--    var_product_filter_table := format('promo_product_filter_resim_%s_%s', var_promo_id, var_scenario_key);
--
--    RAISE NOTICE 'Resolved → output table: price_promo_opt_temp.%s', var_full_table_name;
--    RAISE NOTICE 'Resolved → product filter table: price_promo_opt_temp.%s', var_product_filter_table;
--
--    -- Step 5: Create output table
--    EXECUTE format('DROP TABLE IF EXISTS price_promo_opt_temp.%s;', var_full_table_name);
--    EXECUTE format('
--        CREATE UNLOGGED TABLE price_promo_opt_temp.%s (
--            product_id int4,
--            store_hierarchy text,
--            c0_id int4,
--            week_start_date date,
--            store_split float4
--        )', var_full_table_name);
--    RAISE NOTICE 'Table created: %s', var_full_table_name;
--
--    -- Step 6: Insert from KVI source
--    RAISE NOTICE 'Inserting from KVI source...';
--    EXECUTE format($kvi$
--        INSERT INTO price_promo_opt_temp.%s
--        SELECT 
--            kvi.product_id,
--            CONCAT(sm.s0_id::text, '_', sm.s3_id::text) AS store_hierarchy,
--            kvi.c0_id,
--            kvi.week_start_date,
--            SUM(COALESCE(kvi.store_split_ratio, 0))::float4 AS store_split
--        FROM price_promo_opt.tb_store_split_opt_kvi kvi
--        INNER JOIN (
--            SELECT DISTINCT product_id::int4
--            FROM price_promo_opt_temp.%s
--        ) pf ON pf.product_id = kvi.product_id
--        INNER JOIN price_promo.fn_fetch_stores_for_promo($1) sfp
--            ON sfp.store_id = kvi.store_id
--        INNER JOIN global.tb_store_master sm 
--            ON sm.store_id = kvi.store_id
--        WHERE kvi.week_start_date BETWEEN $2 AND $3
--          AND kvi.c0_id = ANY($4)
--        GROUP BY
--            kvi.product_id,
--            CONCAT(sm.s0_id::text, '_', sm.s3_id::text),
--            kvi.c0_id,
--            kvi.week_start_date
--    $kvi$,
--        var_full_table_name,
--        var_product_filter_table
--    ) USING var_promo_id, var_week_start_date, var_week_end_date, var_c0_ids;
--    RAISE NOTICE 'Insert from KVI complete.';
--
--    -- Step 7: Insert from hierarchy source
--    RAISE NOTICE 'Inserting from hierarchy-based source (non-KVI)...';
--    EXECUTE format($nonkvi$
--        INSERT INTO price_promo_opt_temp.%s
--        SELECT 
--            pm.product_id,
--            CONCAT(sm.s0_id::text, '_', sm.s3_id::text) AS store_hierarchy,
--            sso.c0_id,
--            sso.week_start_date,
--            SUM(COALESCE(sso.store_split_ratio, 0))::float4 AS store_split
--        FROM price_promo_opt.tb_store_split_opt sso
--        INNER JOIN price_promo.product_master pm
--            ON pm.l0_cid = sso.l0_cid
--           AND pm.l1_cid = sso.l1_cid
--           AND pm.l2_cid = sso.l2_cid
--           AND pm.l3_cid = sso.l3_cid
--        INNER JOIN (
--            SELECT DISTINCT pf.product_id::int4
--            FROM price_promo_opt_temp.%s pf
--            WHERE pf.product_id::int4 NOT IN (
--                SELECT DISTINCT product_id
--                FROM price_promo_opt.tb_store_split_opt_kvi
--                WHERE week_start_date BETWEEN $1 AND $2
--                  AND c0_id = ANY($3)
--            )
--        ) pf2 ON pf2.product_id::bigint = pm.product_id
--        INNER JOIN price_promo.fn_fetch_stores_for_promo($4) sfp
--            ON sfp.store_id = sso.store_id
--        INNER JOIN global.tb_store_master sm 
--            ON sm.store_id = sso.store_id
--        WHERE sso.week_start_date BETWEEN $5 AND $6
--          AND sso.c0_id = ANY($7)
--        GROUP BY
--            pm.product_id,
--            CONCAT(sm.s0_id::text, '_', sm.s3_id::text),
--            sso.c0_id,
--            sso.week_start_date
--    $nonkvi$,
--        var_full_table_name,
--        var_product_filter_table
--    ) USING var_week_start_date, var_week_end_date, var_c0_ids,
--            var_promo_id,
--            var_week_start_date, var_week_end_date, var_c0_ids;
--    RAISE NOTICE 'Insert from non-KVI source complete.';
--
--    -- Step 8: Create index
--    EXECUTE format('
--        CREATE INDEX idx_%s
--        ON price_promo_opt_temp.%s 
--        USING btree (week_start_date, product_id, c0_id, store_hierarchy)', 
--        var_full_table_name, var_full_table_name);
--    RAISE NOTICE 'Index created.';
--    RAISE NOTICE '--- PROCEDURE COMPLETE ---';
END;
$procedure$
;
