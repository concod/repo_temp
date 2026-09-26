--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_fetch_products_for_finalized_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_fetch_products_for_finalized_promos

DROP PROCEDURE if exists price_promo_opt.pc_fetch_products_for_finalized_promos;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_fetch_products_for_finalized_promos(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

-- Purpose – Identifies and populates products for finalized promotions active on a given date
-- 
-- Example – CALL price_promo_opt.pc_fetch_products_for_finalized_promos('2023-01-15');
-- 
-- Other Functions Used:
-- * price_promo.fn_get_promo_final_products - Retrieves final products for a promotion based on inclusion/exclusion rules
-- * price_promo.fn_fetch_stores_for_promo - Retrieves stores applicable for a promotion
-- 
-- Tables Used:
-- * price_promo_opt.current_finalized_promo_products - Target table where product data is stored
-- * price_promo_opt_temp.actuals_ly_lw_products - Temporary table for last year/last week products
-- * price_promo.promo_master - Contains master promotion data
-- * price_promo.store_master - Contains store information
-- * price_promo_opt.promo_txn - Contains transaction data for promotions
-- 
-- Returns – No direct return value; populates the current_finalized_promo_products table

DECLARE

    distinct_promo_id INT4;

BEGIN

    -- Truncate existing data in the target table

    TRUNCATE TABLE price_promo_opt.current_finalized_promo_products;



    -- Step 1: Create an unlogged table to hold LY (Last Year) and LW (Last Week) products

    CREATE UNLOGGED TABLE IF NOT EXISTS price_promo_opt_temp.actuals_ly_lw_products AS
    SELECT product_id
    FROM price_promo_opt.promo_txn
    WHERE date_id = var_date - INTERVAL '1 year'
    GROUP BY product_id
    UNION

    SELECT product_id
    FROM price_promo_opt.promo_txn
    WHERE date_id = var_date - INTERVAL '1 week'
    GROUP BY product_id;

    -- Index for faster lookups

    CREATE INDEX IF NOT EXISTS idx_actuals_ly_lw_products ON price_promo_opt_temp.actuals_ly_lw_products (product_id);


    -- Step 2: Retrieve distinct promo_id for finalized promos in the given date range

    FOR distinct_promo_id IN
        SELECT DISTINCT promo_id
        FROM price_promo.promo_master pm
        WHERE status in (4,8)
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

            (promo_id, product_id, recommendation_date, store_reco_level, customer_reco_level)

        SELECT distinct

            distinct_promo_id AS promo_id,
            product_id,
            var_date AS recommendation_date,
--            s0_id,
--            s1_id, 
            store_reco_level,
			customer_reco_level
        FROM prod_data_cte AS prod_data

        CROSS JOIN (
            SELECT store_reco_level,
			----CHANGE APRIL 24----
			store_id
--			concat (s0_id,'_', s1_id) as store_reco_level
			----CHANGE APRIL 24----
            FROM global.tb_store_master
            INNER JOIN price_promo.fn_fetch_stores_for_promo(distinct_promo_id)
            USING (store_id)
            GROUP BY 1,2
        ) ss

		CROSS JOIN (
            SELECT customer_reco_level,
			customer_id
            FROM global.customer_master
            INNER JOIN price_promo.fn_fetch_customers_for_promo(distinct_promo_id)
            USING (customer_id)
            GROUP BY 1,2
        ) cc;

    END LOOP;


    -- Clean up: Drop the unlogged table

    DROP TABLE IF EXISTS price_promo_opt_temp.actuals_ly_lw_products;

END;

$procedure$
;

