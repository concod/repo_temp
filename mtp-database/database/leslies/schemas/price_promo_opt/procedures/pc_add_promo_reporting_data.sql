--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_promo_reporting_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_add_promo_reporting_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_promo_reporting_data ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_promo_reporting_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
--test
DECLARE
	ps_actuals_table TEXT;
	promo_txn_table TEXT;
	fin_table TEXT;
	promo_txn_table_lw TEXT;
	promo_txn_table_ly TEXT;
	query TEXT;
BEGIN
	ps_actuals_table := CONCAT('ps_recommended_actuals_', TO_CHAR(var_date, 'yyyymmdd'));
	promo_txn_table := CONCAT('promo_txn_', TO_CHAR(var_date, 'yyyymmdd'));
	promo_txn_table_lw := CONCAT('promo_txn_', TO_CHAR(var_date - INTERVAL '1 week', 'yyyymmdd'));
	promo_txn_table_ly := CONCAT('promo_txn_', TO_CHAR(var_date - INTERVAL '1 year', 'yyyymmdd'));

	call price_promo_opt.pc_create_date_partitions('price_promo', 'ps_reporting_post_promo_date', 'day', '14 day', 'backwards');

	DELETE FROM price_promo.ps_reporting_post_promo_date WHERE date = var_date;


    -- Construct the query dynamically using EXECUTE format
    query := FORMAT(' DROP TABLE IF EXISTS price_promo_opt_temp.promo_reporting_ly_temp;
        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_reporting_ly_temp AS
				SELECT
				cfpp.event_id,
	    		cfpp.promo_id, 
	    		cfpp.s0_id, 
				cfpp.s3_id,
				cfpp.customer_id, 
	    		cfpp.product_id, 
				ptxn.date_id as ly_date,
		    	ROUND(SUM(coalesce(ptxn.gross_quantity, 0))::NUMERIC, 2) AS ly_sales_units,
		    	ROUND(SUM(coalesce(ptxn.gross_revenue, 0))::NUMERIC, 2) AS ly_revenue,
		    	ROUND(SUM(coalesce(ptxn.gross_margin, 0))::NUMERIC, 2) AS ly_margin,
				ROUND(SUM(coalesce(ptxn.contri_margin, 0))::NUMERIC, 2) AS ly_contribution_margin,
				ROUND(SUM(coalesce(ptxn.gross_revenue, 0))::NUMERIC, 2) AS ly_contribution_revenue
		    	
				FROM
					price_promo.%I ptxn
					INNER JOIN 
					price_promo_opt_temp.current_finalized_promo_products_temp cfpp
					ON ptxn.product_id = cfpp.product_id
					AND ptxn.store_id = cfpp.store_id
					AND ptxn.c2_id = cfpp.customer_id
					GROUP BY 1, 2, 3, 4, 5, 6, 7;', 
					promo_txn_table_ly
				);
	RAISE NOTICE 'Executing SQL QUERY 1: %', query;
    EXECUTE query;

   	    -- Construct the query dynamically using EXECUTE format for LW data
    query := FORMAT(' DROP TABLE IF EXISTS price_promo_opt_temp.promo_reporting_lw_temp;
        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_reporting_lw_temp AS
        SELECT
				cfpp.event_id,
	    		cfpp.promo_id, 
	    		cfpp.s0_id, 
				cfpp.s3_id,
				cfpp.customer_id, 
	    		cfpp.product_id, 
				ptxn.date_id as lw_date,
		    	ROUND(SUM(coalesce(ptxn.gross_quantity, 0))::NUMERIC, 2) AS lw_sales_units,
		    	ROUND(SUM(coalesce(ptxn.gross_revenue, 0))::NUMERIC, 2) AS lw_revenue,
		    	ROUND(SUM(coalesce(ptxn.gross_margin, 0))::NUMERIC, 2) AS lw_margin,
				ROUND(SUM(coalesce(ptxn.contri_margin, 0))::NUMERIC, 2) AS lw_contribution_margin,
				ROUND(SUM(coalesce(ptxn.gross_revenue, 0))::NUMERIC, 2) AS lw_contribution_revenue
		    	
				FROM
					price_promo.%I ptxn
					INNER JOIN 
					price_promo_opt_temp.current_finalized_promo_products_temp cfpp
					ON ptxn.product_id = cfpp.product_id
					AND ptxn.store_id = cfpp.store_id
					AND ptxn.c2_id = cfpp.customer_id
					GROUP BY 1, 2, 3, 4, 5, 6, 7;', 
					promo_txn_table_lw
				);
	RAISE NOTICE 'Executing SQL QUERY 2: %', query;
    EXECUTE query;

    query := FORMAT(' DROP TABLE IF EXISTS price_promo_opt_temp.promo_reporting_actual_temp;
    CREATE UNLOGGED TABLE price_promo_opt_temp.promo_reporting_actual_temp AS
    SELECT 
        pra.event_id, 
        pra.promo_id, 
        pra.product_id, 
        pra.s0_id, 
        pra.s3_id, 
        pra.store_hierarchy, 
        pra.customer_id, 
        pra.recommendation_date AS date,
        sm.s0_name AS channel, 
        sm.s0_name, 
        sm.s3_name, 
        cm.customer_name,
        tfdm.fiscal_week AS fw,  
        tfdm.fiscal_year AS fy, 
        tfdm.weeks_start_date AS week_start_date, 
        prm.is_default,
        SUM(sales_units) AS actual_sales_units, 
        SUM(revenue) AS actual_revenue, 
        SUM(margin) AS actual_margin,
        ROUND(((1 - COALESCE(SUM(discounted_price)/NULLIF(SUM(original_price), 0), 1)) * 100)::NUMERIC, 2) AS actual_discount,
        SUM(baseline_sales_units) AS baseline_sales_units, 
        SUM(baseline_revenue) AS baseline_revenue, 
        SUM(baseline_margin) AS baseline_margin, 
        SUM(COALESCE(contribution_margin, 0)) AS actual_contribution_margin,
        SUM(COALESCE(contribution_revenue, 0)) AS actual_contribution_revenue
    FROM price_promo.%s pra 
    INNER JOIN (
        SELECT DISTINCT s0_id, s0_name, s3_id, s3_name 
        FROM global.tb_store_master
    ) sm ON pra.s0_id = sm.s0_id AND pra.s3_id = sm.s3_id

    INNER JOIN (
        SELECT DISTINCT customer_id, customer_name 
        FROM global.customer_master
    ) cm ON pra.customer_id = cm.customer_id 

    INNER JOIN global.tb_fiscal_date_mapping tfdm ON pra.recommendation_date = tfdm.date

    LEFT JOIN (
        SELECT a.event_id, a.promo_id, offer_distribution_channel, 
               COALESCE(is_default, false) AS is_default
        FROM price_promo.promo_master a
        LEFT JOIN price_promo.tb_promo_override_forecast b
            ON a.promo_id = b.promo_id AND a.last_approved_scenario_id = b.scenario_id
    ) AS prm USING (promo_id)
    GROUP BY 
        pra.event_id, 
        pra.promo_id, 
        pra.product_id, 
        pra.s0_id, 
        pra.s3_id, 
        pra.store_hierarchy, 
        pra.customer_id, 
        pra.recommendation_date,
        sm.s0_name, 
        sm.s3_name, 
        cm.customer_name, 
        tfdm.fiscal_week,  
        tfdm.fiscal_year, 
        tfdm.weeks_start_date, 
        prm.is_default
', ps_actuals_table);
	RAISE NOTICE 'Executing SQL QUERY3 : %', query;
	EXECUTE query;

    -- Create index on actual base
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_promo_reporting_actual_temp
	ON price_promo_opt_temp.promo_reporting_actual_temp (promo_id, s0_id, s3_id, product_id);';


	query := FORMAT(
		'INSERT INTO price_promo.ps_reporting_post_promo_date ( 
		event_id,
	    promo_id, product_id, customer_id, s0_id, s3_id, store_hierarchy, 
		channel, s0_name, s3_name, customer_name,
	    date, fw, fy, week_start_date,
	    actual_sales_units, lw_sales_units, ly_sales_units,

        --actual_item_plan_unit, actual_item_plan_revenue, actual_item_plan_margin,
        --ly_item_plan_unit, ly_item_plan_revenue, ly_item_plan_margin,
        --lw_item_plan_unit, lw_item_plan_revenue, lw_item_plan_margin,

	    actual_revenue, lw_revenue, ly_revenue,
	    actual_margin, lw_margin, ly_margin,
	    actual_discount, 
		--actual_inventory,
	    actual_contribution_revenue, lw_contribution_revenue, ly_contribution_revenue,
	    actual_contribution_margin, lw_contribution_margin, ly_contribution_margin,
	    baseline_sales_units, baseline_revenue, baseline_margin,
	    finalized_sales_units, finalized_revenue, finalized_margin,
	    finalized_contribution_revenue, finalized_contribution_margin,
		fs_sales_units, fs_revenue, fs_margin,
		fso_sales_units, fso_revenue, fso_margin
		--finalized_spend
		)
		(
	    SELECT
			prat.event_id, 
	        promo_id, product_id, customer_id, prat.s0_id, prat.s3_id, prat.store_hierarchy,
			prat.channel, prat.s0_name, prat.s3_name, prat.customer_name,
	        date, fw, fy, week_start_date,
	        actual_sales_units, COALESCE(lw_sales_units, 0) AS lw_sales_units, COALESCE(ly_sales_units, 0) AS ly_sales_units,

			actual_revenue, COALESCE(lw_revenue, 0) AS lw_revenue, COALESCE(ly_revenue, 0) AS ly_revenue,
	        actual_margin, COALESCE(lw_margin, 0) AS lw_margin, COALESCE(ly_margin, 0) AS ly_margin,
	        actual_discount, 
			--actual_inventory,
	        actual_contribution_revenue, 
			COALESCE(lw_contribution_revenue, 0) AS lw_contribution_revenue,
			COALESCE(ly_contribution_revenue, 0) AS ly_contribution_revenue,
	        actual_contribution_margin, 
			COALESCE(lw_contribution_margin, 0) AS lw_contribution_margin,
			COALESCE(ly_contribution_margin, 0) AS ly_contribution_margin,
	        baseline_sales_units, baseline_revenue, baseline_margin,
			CASE WHEN is_default THEN fso.finalized_sales_units ELSE fs.finalized_sales_units END AS finalized_sales_units,
			CASE WHEN is_default THEN fso.finalized_revenue ELSE fs.finalized_revenue END AS finalized_revenue,
			CASE WHEN is_default THEN fso.finalized_margin ELSE fs.finalized_margin END AS finalized_margin,
			CASE WHEN is_default THEN fso.finalized_contribution_revenue ELSE fs.finalized_contribution_revenue END AS finalized_contribution_revenue,
			CASE WHEN is_default THEN fso.finalized_contribution_margin ELSE fs.finalized_contribution_margin END AS finalized_contribution_margin,

			fs.finalized_sales_units, fs.finalized_revenue, fs.finalized_margin,
			fso.finalized_sales_units, fso.finalized_revenue, fso.finalized_margin
			-- New spend columns June 20 --
--			CASE WHEN is_default THEN fso.finalized_spend ELSE fs.finalized_spend END AS finalized_spend

		    FROM
				price_promo_opt_temp.promo_reporting_actual_temp prat
		    LEFT JOIN (
		    	SELECT
		    		promo_id, store_hierarchy, customer_id, product_id, recommendation_date as date,
		    		SUM(sales_units) AS finalized_sales_units,
		    		SUM(revenue) AS finalized_revenue,
		    		SUM(margin) AS finalized_margin,
					SUM(coalesce(contribution_margin,0)) as finalized_contribution_margin,
					SUM(coalesce(contribution_revenue,0)) as finalized_contribution_revenue
					-- June 20 --
--					SUM(COALESCE(promo_spend, 0)) AS finalized_spend
			    	FROM price_promo_opt_temp.fin_stack
			    	GROUP BY promo_id, store_hierarchy, customer_id,  product_id, recommendation_date
			    ) AS fs using(promo_id, store_hierarchy, customer_id, product_id, date)

			 LEFT JOIN (
		    	SELECT
		    		promo_id, store_hierarchy, customer_id,  product_id, recommendation_date as date,
		    		SUM(sales_units) AS finalized_sales_units,
		    		SUM(revenue) AS finalized_revenue,
		    		SUM(margin) AS finalized_margin,
					SUM(coalesce(contribution_margin,0)) as finalized_contribution_margin,
					SUM(coalesce(contribution_revenue,0)) as finalized_contribution_revenue
					-- June 20 --
--					SUM(COALESCE(promo_spend, 0)) AS finalized_spend
			    	FROM price_promo_opt_temp.fin_stack_override
			    	GROUP BY promo_id, store_hierarchy, customer_id, product_id, recommendation_date
			    ) AS fso using(promo_id, store_hierarchy, customer_id,  product_id, date)

		    LEFT JOIN price_promo_opt_temp.promo_reporting_lw_temp AS lw_data using(promo_id, s0_id, s3_id, product_id, customer_id)
		    LEFT JOIN price_promo_opt_temp.promo_reporting_ly_temp AS ly_data using(promo_id, s0_id, s3_id, product_id, customer_id)
		);'	);
	RAISE NOTICE 'Executing SQL QUERY FINAL: %', query;
	EXECUTE query;

END;
$procedure$
;
