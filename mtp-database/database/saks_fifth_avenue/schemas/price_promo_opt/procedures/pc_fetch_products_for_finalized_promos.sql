--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_fetch_products_for_finalized_promos_v261124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_fetch_products_for_finalized_promos_v3.1

DROP PROCEDURE IF EXISTS price_promo_opt.pc_fetch_products_for_finalized_promos(date);

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_fetch_products_for_finalized_promos(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    distinct_promo_id INT4;
BEGIN
    -- Truncate existing data in the target table
    TRUNCATE TABLE price_promo_opt.current_finalized_promo_products;

    -- Step 1: Create an unlogged table to hold LY (Last Year) and LW (Last Week) products
    CREATE UNLOGGED TABLE IF NOT EXISTS price_promo_opt_temp.actuals_ly_lw_products AS
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
    CREATE INDEX IF NOT EXISTS idx_actuals_ly_lw_products ON price_promo_opt_temp.actuals_ly_lw_products (product_id);

    -- Step 2: Retrieve distinct promo_id for finalized promos in the given date range
    FOR distinct_promo_id IN
        SELECT DISTINCT promo_id
        FROM price_promo.promo_master pm
        WHERE status = 8
        AND var_date BETWEEN start_date AND end_date
    LOOP
        -- Step 3: Define a CTE to combine final products with LY/LW overlap
        WITH prod_data_cte AS MATERIALIZED (
            -- Combine final products and overlapping LY/LW products
            SELECT product_id
            FROM (
                -- Final products (active)
                SELECT unnest(price_promo.fn_get_promo_final_products(distinct_promo_id, 1)) AS product_id
                UNION ALL
                -- Overlapping LY/LW products (inactive)
                SELECT a.product_id
                FROM unnest(price_promo.fn_get_promo_final_products(distinct_promo_id, 0)) AS a(product_id)
                INNER JOIN price_promo_opt_temp.actuals_ly_lw_products b
                ON a.product_id = b.product_id
            ) combined
            GROUP BY product_id
        )

        -- Step 4: Insert final product data into the target table
        INSERT INTO price_promo_opt.current_finalized_promo_products
            (promo_id, product_id, recommendation_date, s0_id, s1_id)
        SELECT
            distinct_promo_id AS promo_id,
            product_id,
            var_date AS recommendation_date,
            s0_id,
            s1_id
        FROM prod_data_cte AS prod_data
        CROSS JOIN (
            SELECT s0_id, s1_id
            FROM "global".tb_store_master
            INNER JOIN price_promo.fn_fetch_stores_for_promo(distinct_promo_id)
            USING (store_id)
            GROUP BY s0_id, s1_id
        ) ss;
    END LOOP;

    -- Clean up: Drop the unlogged table
    DROP TABLE IF EXISTS price_promo_opt_temp.actuals_ly_lw_products;
END;
$procedure$
;
