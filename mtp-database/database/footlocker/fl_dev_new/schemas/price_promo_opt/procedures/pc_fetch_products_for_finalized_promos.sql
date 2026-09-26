--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_fetch_products_for_finalized_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_fetch_products_for_finalized_promos

DROP PROCEDURE if exists price_promo_opt.pc_fetch_products_for_finalized_promos;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_fetch_products_for_finalized_promos(IN var_date date, IN _customer_flag integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    distinct_promo_id INT4;
BEGIN

    TRUNCATE TABLE price_promo_opt.current_finalized_promo_products;

    -- Step 1: Create LY/LW product temp table
    CREATE UNLOGGED TABLE IF NOT EXISTS price_promo_opt_temp.actuals_ly_lw_products AS
    SELECT product_id FROM price_promo_opt.promo_txn WHERE date_id = var_date - INTERVAL '1 year' GROUP BY 1
    UNION
    SELECT product_id FROM price_promo_opt.promo_txn WHERE date_id = var_date - INTERVAL '1 week' GROUP BY 1;

    CREATE INDEX IF NOT EXISTS idx_actuals_ly_lw_products ON price_promo_opt_temp.actuals_ly_lw_products (product_id);

    -- Step 2: Loop through finalized promos
    FOR distinct_promo_id IN
        SELECT DISTINCT promo_id FROM price_promo.promo_master 
        WHERE status = 8 AND var_date BETWEEN start_date AND end_date
    LOOP

        WITH prod_data_cte AS MATERIALIZED (
            SELECT product_id
            FROM (
                SELECT unnest(price_promo.fn_get_promo_final_products(distinct_promo_id, 1)) AS product_id
                UNION ALL
                SELECT a.product_id
                FROM unnest(price_promo.fn_get_promo_final_products(distinct_promo_id, 0)) AS a(product_id)
                INNER JOIN price_promo_opt_temp.actuals_ly_lw_products b ON a.product_id = b.product_id
            ) combined
            GROUP BY product_id
        )

        INSERT INTO price_promo_opt.current_finalized_promo_products
            (promo_id, product_id, recommendation_date, store_id, store_reco_level, customer_reco_level)
        SELECT distinct
            distinct_promo_id AS promo_id,
            prod_data.product_id,
            var_date AS recommendation_date,
            ss.store_id,
            ss.store_reco_level,
            cc.customer_reco_level
        FROM prod_data_cte AS prod_data
        CROSS JOIN (
            SELECT store_id, store_reco_level
            FROM global.tb_store_master
            INNER JOIN price_promo.fn_fetch_stores_for_promo(distinct_promo_id) USING (store_id)
            GROUP BY 1,2
        ) ss
        CROSS JOIN (
            -- Part 1: Fetch actual levels if flag is 1
            -- We cast to TEXT here to match the common denominator if your level is a string name
            SELECT customer_reco_level::text 
            FROM global.customer_master
            INNER JOIN price_promo.fn_fetch_customers_for_promo(distinct_promo_id) USING (customer_id)
            WHERE _customer_flag = 1 
            GROUP BY 1

            UNION ALL

            -- Part 2: Return NULL as TEXT if flag is 0
            SELECT NULL::text 
            WHERE _customer_flag != 1
        ) cc;

    END LOOP;

    DROP TABLE IF EXISTS price_promo_opt_temp.actuals_ly_lw_products;

END;
$procedure$
;