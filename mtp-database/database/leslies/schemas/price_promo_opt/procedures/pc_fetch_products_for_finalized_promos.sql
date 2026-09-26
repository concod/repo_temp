--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_fetch_products_for_finalized_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_fetch_products_for_finalized_promos

DROP PROCEDURE IF EXISTS price_promo_opt.pc_fetch_products_for_finalized_promos ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_fetch_products_for_finalized_promos(IN var_date date)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    distinct_promo_id INT4;
    promo_event_id INT4;
    start_time timestamp;
    end_time timestamp;
    index_start_time timestamp;
    index_duration interval;
    duration interval;
BEGIN
    start_time := clock_timestamp();
    
    -- Step 1: Create an unlogged table to hold LY (Last Year) and LW (Last Week) products
    DROP TABLE IF EXISTS price_promo_opt_temp.actuals_ly_lw_products;
    CREATE UNLOGGED TABLE price_promo_opt_temp.actuals_ly_lw_products AS
    SELECT product_id
    FROM price_promo.promo_txn
    WHERE date_id = var_date - INTERVAL '1 year'
    GROUP BY product_id
    UNION
    SELECT product_id
    FROM price_promo.promo_txn
    WHERE date_id = var_date - INTERVAL '1 week'
    GROUP BY product_id;

    -- Index for faster lookups
    CREATE INDEX idx_actuals_ly_lw_products ON price_promo_opt_temp.actuals_ly_lw_products (product_id);

    -- Step 2: Create the unlogged table for finalized promo products
    DROP TABLE IF EXISTS price_promo_opt_temp.current_finalized_promo_products_temp;
    CREATE UNLOGGED TABLE price_promo_opt_temp.current_finalized_promo_products_temp AS
    WITH active_promos AS (
        SELECT DISTINCT promo_id, event_id
        FROM price_promo.promo_master
        WHERE status IN (4, 8)
        AND var_date BETWEEN start_date AND end_date
    ),
    prod_data AS (
        SELECT
            ap.promo_id,
            p.product_id
        FROM active_promos ap,
        LATERAL (
            SELECT product_id
            FROM (
                SELECT unnest(price_promo.fn_get_promo_final_products(ap.promo_id, 1)) AS product_id
                UNION ALL
                SELECT a.product_id
                FROM unnest(price_promo.fn_get_promo_final_products(ap.promo_id, 0)) AS a(product_id)
                INNER JOIN price_promo_opt_temp.actuals_ly_lw_products b ON a.product_id = b.product_id
            ) combined
            GROUP BY product_id
        ) p
    ),
    store_customer_data AS (
        SELECT
            ap.promo_id,
            s.s0_id,
            s.s1_id,
            s.s3_id,
            s.store_id,
            s.store_hierarchy,
            c.customer_id
        FROM active_promos ap
        CROSS JOIN LATERAL (
            SELECT s0_id, s1_id, s3_id, store_id, concat(s0_id, '_', s3_id) as store_hierarchy
            FROM "global".tb_store_master
            INNER JOIN price_promo.fn_fetch_stores_for_promo(ap.promo_id) USING (store_id)
            GROUP BY s0_id, s1_id, s3_id, store_id
        ) s
        CROSS JOIN LATERAL (
            SELECT cm.customer_id, cm.c0_id
            FROM price_promo.tb_promo_customers tpc
            JOIN global.customer_master cm ON tpc.customer_id = cm.c2_id
            WHERE tpc.promo_id = ap.promo_id
        ) c
        INNER JOIN "global".customer_channel_master ccm ON ccm.c0_id = c.c0_id AND ccm.s0_id = s.s0_id
    )
    SELECT
        ap.promo_id,
        ap.event_id,
        pd.product_id,
        var_date AS recommendation_date,
        scd.s0_id,
        scd.s3_id,
        scd.store_id,
        scd.store_hierarchy,
        scd.customer_id
    FROM active_promos ap
    JOIN prod_data pd ON ap.promo_id = pd.promo_id
    JOIN store_customer_data scd ON ap.promo_id = scd.promo_id;

    -- Clean up: Drop the intermediate unlogged table
    DROP TABLE IF EXISTS price_promo_opt_temp.actuals_ly_lw_products;

    -- Start timing for index creation
    index_start_time := clock_timestamp();

    -- Create indexes for optimal query performance
    CREATE INDEX current_final_agg_product_id_idx ON price_promo_opt_temp.current_finalized_promo_products_temp USING btree (product_id);
    CREATE INDEX current_final_agg_promo_id_idx ON price_promo_opt_temp.current_finalized_promo_products_temp USING btree (promo_id);
    CREATE INDEX current_final_agg_promo_product_channel_idx ON price_promo_opt_temp.current_finalized_promo_products_temp USING btree (promo_id, product_id, s0_id, s3_id);
    
    -- Calculate and display timing
    end_time := clock_timestamp();
    index_duration := end_time - index_start_time;
    duration := end_time - start_time;
    
    RAISE NOTICE 'Index creation took: %', index_duration;
    RAISE NOTICE 'pc_fetch_products_for_finalized_promos completed in: % (total)', duration;
END;
$procedure$
;
