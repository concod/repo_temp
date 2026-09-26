--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_promo_reporting_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Formatted and comprehensive version of pc_add_promo_reporting_data.

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_promo_reporting_data;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_promo_reporting_data(
    IN var_date date, 
    IN customer_flag integer DEFAULT 0
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    -- Table naming
    ps_actuals_table        TEXT;
    promo_txn_table         TEXT;
    promo_txn_table_lw      TEXT;
    promo_txn_table_ly      TEXT;
    budget_master_table     TEXT;
    budget_master_table_lw  TEXT;
    budget_master_table_ly  TEXT;
    
    -- Dynamic SQL parts
    customer_store_join     TEXT;
    product_store_reco_customer_reco TEXT;
    query                   TEXT;

BEGIN
    ---------------------------------------------------------------------------
    -- 1. INITIALIZE VARIABLES
    ---------------------------------------------------------------------------
    ps_actuals_table        := CONCAT('ps_recommended_actuals_', TO_CHAR(var_date, 'yyyymmdd'));
    promo_txn_table         := CONCAT('promo_txn_', TO_CHAR(var_date, 'yyyymmdd'));
    promo_txn_table_lw      := CONCAT('promo_txn_', TO_CHAR(var_date - INTERVAL '1 week', 'yyyymmdd'));
    promo_txn_table_ly      := CONCAT('promo_txn_', TO_CHAR(var_date - INTERVAL '1 year', 'yyyymmdd'));
    
    budget_master_table     := CONCAT('tb_budget_master_ty_agg_', TO_CHAR(var_date, 'yyyymmdd'));
    budget_master_table_lw  := CONCAT('tb_budget_master_ty_agg_', TO_CHAR(var_date - INTERVAL '1 week', 'yyyymmdd'));
    budget_master_table_ly  := CONCAT('tb_budget_master_ty_agg_', TO_CHAR(var_date - INTERVAL '1 year', 'yyyymmdd'));
    
    IF customer_flag = 1 THEN
        customer_store_join := 'product_id, store_id, customer_reco_level';
        product_store_reco_customer_reco := 'product_id, store_reco_level, customer_reco_level';
    ELSE
        customer_store_join := 'product_id, store_id';
        product_store_reco_customer_reco := 'product_id, store_reco_level';
    END IF;

    ---------------------------------------------------------------------------
    -- 2. SETUP PARTITIONS & CLEANUP
    ---------------------------------------------------------------------------
    CALL price_promo_opt.pc_create_date_partitions('price_promo', 'ps_reporting_post_promo_date', 'day', '14 day', 'backwards');
    
    DELETE FROM price_promo.ps_reporting_post_promo_date WHERE date = var_date;

    ---------------------------------------------------------------------------
    -- 3. CREATE LY TEMP TABLE (Last Year)
    ---------------------------------------------------------------------------
    query := FORMAT('
        DROP TABLE IF EXISTS price_promo_opt_temp.promo_reporting_ly_temp;
        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_reporting_ly_temp AS
        SELECT
            cfpp.promo_id, ptxn.date_id AS ly_date,
            cfpp.product_id, cfpp.store_reco_level, cfpp.customer_reco_level,
            ROUND(SUM(COALESCE(ptxn.quantity, 0))::NUMERIC, 2) AS ly_sales_units,
            ROUND(SUM(COALESCE(ptxn.revenue, 0))::NUMERIC, 2) AS ly_revenue,
            ROUND(SUM(COALESCE(ptxn.margin, 0))::NUMERIC, 2) AS ly_margin,
            ROUND(SUM(COALESCE(ptxn.promo_spend, 0))::NUMERIC, 2) AS ly_promo_spend,
            ROUND(SUM(COALESCE(ptxn.coupon_spend, 0))::NUMERIC, 2) AS ly_coupon_spend,
            ROUND(SUM(COALESCE(ptxn.revenue * 0.80, 0))::NUMERIC, 2) AS ly_contribution_revenue,
            ROUND(SUM(COALESCE(ptxn.margin * 0.75, 0))::NUMERIC, 2) AS ly_contribution_margin

        FROM price_promo_opt.current_finalized_promo_products cfpp
        INNER JOIN price_promo_opt.%I ptxn USING (%s)

        GROUP BY 1, 2, 3, 4, 5;', 
        promo_txn_table_ly, customer_store_join
    );
    RAISE NOTICE 'Query LY: %', query;
    EXECUTE query;

    ---------------------------------------------------------------------------
    -- 4. CREATE LW TEMP TABLE (Last Week)
    ---------------------------------------------------------------------------
    query := FORMAT('
        DROP TABLE IF EXISTS price_promo_opt_temp.promo_reporting_lw_temp;
        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_reporting_lw_temp AS
        SELECT
            cfpp.promo_id, ptxn.date_id AS lw_date,
            cfpp.product_id, cfpp.store_reco_level, cfpp.customer_reco_level,
            ROUND(SUM(COALESCE(ptxn.quantity, 0))::NUMERIC, 2) AS lw_sales_units,
            ROUND(SUM(COALESCE(ptxn.revenue, 0))::NUMERIC, 2) AS lw_revenue,
            ROUND(SUM(COALESCE(ptxn.margin, 0))::NUMERIC, 2) AS lw_margin,
            ROUND(SUM(COALESCE(ptxn.promo_spend, 0))::NUMERIC, 2) AS lw_promo_spend,
            ROUND(SUM(COALESCE(ptxn.coupon_spend, 0))::NUMERIC, 2) AS lw_coupon_spend,
            ROUND(SUM(COALESCE(ptxn.revenue * 0.80, 0))::NUMERIC, 2) AS lw_contribution_revenue,
            ROUND(SUM(COALESCE(ptxn.margin * 0.75, 0))::NUMERIC, 2) AS lw_contribution_margin

        FROM price_promo_opt.current_finalized_promo_products cfpp
        INNER JOIN price_promo_opt.%I ptxn USING (%s)
        
        GROUP BY 1, 2, 3, 4, 5;', 
        promo_txn_table_lw, customer_store_join
    );
    RAISE NOTICE 'Query LW: %', query;
    EXECUTE query;

    ---------------------------------------------------------------------------
    -- 5. CREATE ACTUALS/TY TEMP TABLE (Current Year)
    ---------------------------------------------------------------------------
    query := FORMAT('
        DROP TABLE IF EXISTS price_promo_opt_temp.promo_reporting_actual_temp;
        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_reporting_actual_temp AS
        SELECT 
            pra.event_id, pra.promo_id, 
            pra.product_id, pra.store_reco_level, 
            pra.customer_reco_level,
            pra.recommendation_date AS date, 
            tfdm.fiscal_week AS fw, tfdm.fiscal_year AS fy, tfdm.fiscal_fd_week AS week_start_date,

            ROUND(((1 - COALESCE(SUM(discounted_price)/NULLIF(SUM(original_price), 0), 1)) * 100)::NUMERIC, 2) AS actual_discount,
            
            -- Actuals
            SUM(sales_units) AS actual_sales_units, 
            SUM(revenue) AS actual_revenue, 
            SUM(margin) AS actual_margin,
            SUM(promo_spend) AS actual_promo_spend,
            SUM(coupon_spend) AS actual_coupon_spend,
            SUM(price_spend) AS actual_price_spend,

            -- Baseline
            SUM(baseline_sales_units) AS baseline_sales_units, 
            SUM(baseline_revenue) AS baseline_revenue, 
            SUM(baseline_margin) AS baseline_margin,

            -- Contribution
            SUM(COALESCE(contribution_margin, 0)) AS actual_contribution_margin, 
            SUM(COALESCE(contribution_revenue, 0)) AS actual_contribution_revenue,

            -- Actuals Planned
            SUM(COALESCE(budget_actuals.planned_units, 0)) AS actual_planned_units,
            SUM(COALESCE(budget_actuals.planned_revenue, 0)) AS actual_planned_revenue,
            SUM(COALESCE(budget_actuals.planned_margin, 0)) AS actual_planned_margin,
            SUM(COALESCE(budget_actuals.planned_promo_spend, 0)) AS actual_planned_promo_spend,

            -- LW Planned
            SUM(COALESCE(budget_lw.lw_planned_units, 0)) AS lw_planned_units,
            SUM(COALESCE(budget_lw.lw_planned_revenue, 0)) AS lw_planned_revenue,
            SUM(COALESCE(budget_lw.lw_planned_margin, 0)) AS lw_planned_margin,
            SUM(COALESCE(budget_lw.lw_planned_promo_spend, 0)) AS lw_planned_promo_spend,

            -- LY Planned
            SUM(COALESCE(budget_ly.ly_planned_units, 0)) AS ly_planned_units,
            SUM(COALESCE(budget_ly.ly_planned_revenue, 0)) AS ly_planned_revenue,
            SUM(COALESCE(budget_ly.ly_planned_margin, 0)) AS ly_planned_margin,
            SUM(COALESCE(budget_ly.ly_planned_promo_spend, 0)) AS ly_planned_promo_spend

        FROM price_promo.%I pra 
        INNER JOIN global.tb_fiscal_date_mapping tfdm ON pra.recommendation_date = tfdm.date

        LEFT JOIN (
            SELECT %s, 
            SUM(units) as planned_units, SUM(revenue) as planned_revenue, 
            SUM(margin) as planned_margin, SUM(promo_spend) as planned_promo_spend 
            FROM price_promo_opt.%I 
            GROUP BY %s
        ) budget_actuals USING (%s)

        LEFT JOIN (
            SELECT %s, 
            SUM(units) as lw_planned_units, SUM(revenue) as lw_planned_revenue, 
            SUM(margin) as lw_planned_margin, SUM(promo_spend) as lw_planned_promo_spend 
            FROM price_promo_opt.%I 
            GROUP BY %s
        ) budget_lw USING (%s)

        LEFT JOIN (
            SELECT %s, 
            SUM(units) as ly_planned_units, SUM(revenue) as ly_planned_revenue, 
            SUM(margin) as ly_planned_margin, SUM(promo_spend) as ly_planned_promo_spend 
            FROM price_promo_opt.%I 
            GROUP BY %s
        ) budget_ly USING (%s)

        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9;', 
        -- Placeholders Argument List:
        ps_actuals_table, 
        product_store_reco_customer_reco, budget_master_table, product_store_reco_customer_reco, product_store_reco_customer_reco,
        product_store_reco_customer_reco, budget_master_table_lw, product_store_reco_customer_reco, product_store_reco_customer_reco,
        product_store_reco_customer_reco, budget_master_table_ly, product_store_reco_customer_reco, product_store_reco_customer_reco
    );
    RAISE NOTICE 'Query Actuals: %', query;
    EXECUTE query;

    ---------------------------------------------------------------------------
    -- 6. FINAL INSERTION
    ---------------------------------------------------------------------------
    query := FORMAT('
        INSERT INTO price_promo.ps_reporting_post_promo_date ( 
            event_id, promo_id, product_id, store_reco_level, customer_reco_level,
            date, fw, fy, week_start_date,
            actual_sales_units, lw_sales_units, ly_sales_units,
            actual_planned_units, ly_planned_units, lw_planned_units,
            actual_revenue, lw_revenue, ly_revenue,
            actual_planned_revenue, ly_planned_revenue, lw_planned_revenue,
            actual_margin, lw_margin, ly_margin,
            actual_planned_margin, ly_planned_margin, lw_planned_margin,
            actual_discount,
            actual_contribution_revenue, lw_contribution_revenue, ly_contribution_revenue,
            actual_contribution_margin, lw_contribution_margin, ly_contribution_margin,
            baseline_sales_units, baseline_revenue, baseline_margin,
            finalized_sales_units, finalized_revenue, finalized_margin,
            
            -- Spend Metrics
            actual_spend, lw_spend, ly_spend, finalized_spend,
            actual_coupon_spend, lw_coupon_spend, ly_coupon_spend, finalized_coupon_spend,
            actual_planned_spend, lw_planned_spend, ly_planned_spend
        )
        SELECT
            prat.event_id, 
            prat.promo_id, 
            prat.product_id, 
            prat.store_reco_level,
            prat.customer_reco_level,
            prat.date,
            prat.fw, 
            prat.fy, 
            prat.week_start_date,
            
            prat.actual_sales_units, COALESCE(lw.lw_sales_units, 0), COALESCE(ly.ly_sales_units, 0),
            prat.actual_planned_units, COALESCE(prat.ly_planned_units, 0), COALESCE(prat.lw_planned_units, 0),

            prat.actual_revenue, COALESCE(lw.lw_revenue, 0), COALESCE(ly.ly_revenue, 0),
            prat.actual_planned_revenue, COALESCE(prat.ly_planned_revenue, 0), COALESCE(prat.lw_planned_revenue, 0),

            prat.actual_margin, COALESCE(lw.lw_margin, 0), COALESCE(ly.ly_margin, 0),
            prat.actual_planned_margin, COALESCE(prat.ly_planned_margin, 0), COALESCE(prat.lw_planned_margin, 0),

            prat.actual_discount,
            prat.actual_contribution_revenue, COALESCE(lw.lw_contribution_revenue, 0), COALESCE(ly.ly_contribution_revenue, 0),
            prat.actual_contribution_margin, COALESCE(lw.lw_contribution_margin, 0), COALESCE(ly.ly_contribution_margin, 0),
            
            prat.baseline_sales_units, prat.baseline_revenue, prat.baseline_margin,
            fs.sales_units, fs.revenue, fs.margin,
            
            -- Spends
            prat.actual_promo_spend, 
            COALESCE(lw.lw_promo_spend, 0), 
            COALESCE(ly.ly_promo_spend, 0), 
            fs.promo_spend,

            prat.actual_coupon_spend, 
            COALESCE(lw.lw_coupon_spend, 0), 
            COALESCE(ly.ly_coupon_spend, 0), 
            fs.coupon_spend,

            prat.actual_planned_promo_spend, 
            COALESCE(prat.lw_planned_promo_spend, 0), 
            COALESCE(prat.ly_planned_promo_spend, 0)

        FROM price_promo_opt_temp.promo_reporting_actual_temp prat

        LEFT JOIN price_promo_opt_temp.promo_reporting_lw_temp lw 
            USING(promo_id, %s)

        LEFT JOIN price_promo_opt_temp.promo_reporting_ly_temp ly 
            USING(promo_id, %s)

        LEFT JOIN (
            SELECT promo_id, recommendation_date AS date,
            %s, 
            SUM(sales_units) AS sales_units, 
            SUM(revenue) AS revenue, 
            SUM(margin) AS margin,
            SUM(promo_spend) AS promo_spend, 
            SUM(coupon_spend) AS coupon_spend
            FROM price_promo_opt_temp.fin_stack 
            GROUP BY %s
        ) AS fs USING(promo_id, date, %s)
		;',
        product_store_reco_customer_reco,
        product_store_reco_customer_reco,
        product_store_reco_customer_reco,
		CASE WHEN customer_flag = 1 THEN '1, 2, 3, 4, 5' ELSE '1, 2, 3, 4' END,
        product_store_reco_customer_reco
    );
    RAISE NOTICE 'Query Final: %', query;
    EXECUTE query;

END;
$procedure$
;