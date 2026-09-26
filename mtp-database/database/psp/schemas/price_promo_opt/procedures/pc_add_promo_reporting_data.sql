--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_promo_reporting_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_promo_reporting_data

DROP PROCEDURE if exists price_promo_opt.pc_add_promo_reporting_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_promo_reporting_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

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

	    		promo_id, --store_reco_level,
	    		txn.product_id, txn.date_id as ly_date,

		    	ROUND(SUM(txn.quantity)::NUMERIC, 2) AS ly_sales_units,

		    	ROUND(SUM(txn.revenue)::NUMERIC, 2) AS ly_revenue,

		    	ROUND(SUM(txn.margin)::NUMERIC, 2) AS ly_margin,
				ROUND(SUM(txn.coupon_spend)::NUMERIC, 2) AS ly_coupon_spend,

--				ROUND(SUM(coalesce(round((txn.revenue * gross_shipped_rate / 100 * (1 - return_rate / 100) *
--
--			(((txn.margin/NULLIF(txn.revenue, 0)) - (net_gm_buffer_percent / 100)) - (variable_sales_percent / 100 )- (marketing_cost_percent / 100) )
--
--			- (txn.quantity * fulfilment_cost_dollar))::numeric,2),0))::NUMERIC,2) 
0 as ly_contribution_margin,

--				ROUND(SUM(coalesce(round(( txn.revenue * gross_shipped_rate / 100 * (1 - return_rate / 100))::numeric,2),0))::NUMERIC,2) 
0				as ly_contribution_revenue,

		    
				--new Columns from item_plan subquery
			    sum(item_plan.item_plan_units) ly_item_plan_unit, 
			    sum(item_plan.item_plan_revenue) as ly_item_plan_revenue,
			    sum(item_plan.item_plan_margin) as ly_item_plan_margin
					FROM

					(SELECT product_id, date_id, --store_reco_level,
--							AVG(COALESCE(aum, 0)) AS aum, AVG(COALESCE(aur, 0)) AS aur, 
SUM(COALESCE(margin, 0)) AS margin, SUM(COALESCE(revenue, 0)) AS revenue,
							SUM(COALESCE(quantity, 0)) AS quantity, 
--AVG(COALESCE(final_amount, 0)) AS final_price,
 AVG(COALESCE(cost, 0)) AS cost,
							AVG(COALESCE(promo_base_price, 0)) AS base_price, AVG(COALESCE(promo_discount, 0)) AS promo_discount,
							SUM(coalesce(coupon_spend,0)) as coupon_spend

					FROM price_promo_opt.%I
					WHERE no_of_txn > 0
					GROUP BY 1, 2--, --3, 4
					) AS txn


					INNER JOIN (SELECT  promo_id, product_id FROM price_promo_opt.current_finalized_promo_products) AS filter_table USING (product_id)

					--LEFT JOIN price_promo_opt.tb_business_metrics_config_opt USING (store_reco_level)

					LEFT JOIN (SELECT promo_id, offer_distribution_channel, customer_type FROM price_promo.promo_master) prm USING (promo_id)

					-- new join with item_plan
					LEFT JOIN 
					(
		    		SELECT product_id, dates AS date_id, 
					units AS item_plan_units, 
					revenue AS item_plan_revenue,
					margin AS item_plan_margin 
					FROM price_promo_opt.tb_budget_master_ty
					) AS item_plan
		            ON item_plan.product_id=txn.product_id AND item_plan.date_id=txn.date_id
					GROUP BY promo_id, --store_reco_level,
					txn.product_id, txn.date_id;', promo_txn_table_ly

				);

	RAISE NOTICE 'Executing SQL QUERY: %', query;

    EXECUTE query;



   	    -- Construct the query dynamically using EXECUTE format

    query := FORMAT(' DROP TABLE IF EXISTS price_promo_opt_temp.promo_reporting_lw_temp;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_reporting_lw_temp AS

        SELECT

	    		promo_id, --store_reco_level,
	    		txn.product_id, txn.date_id as lw_date,
		    	ROUND(SUM(txn.quantity)::NUMERIC, 2) AS lw_sales_units,
		    	ROUND(SUM(txn.revenue)::NUMERIC, 2) AS lw_revenue,
		    	ROUND(SUM(txn.margin)::NUMERIC, 2) AS lw_margin,
				ROUND(SUM(txn.coupon_spend)::NUMERIC, 2) AS lw_coupon_spend,
--				ROUND(SUM(coalesce(round((txn.revenue * gross_shipped_rate / 100 * (1 - return_rate / 100) *
--				((( txn.margin/ NULLIF(txn.revenue, 0)) - (net_gm_buffer_percent / 100)) - (variable_sales_percent / 100 )- (marketing_cost_percent / 100) )
--				- (txn.quantity * fulfilment_cost_dollar))::numeric,2),0))::NUMERIC,2)
				0 as lw_contribution_margin,

				--ROUND(SUM(coalesce(round((txn.revenue * gross_shipped_rate / 100 * (1 - return_rate / 100))::numeric,2),0))::NUMERIC,2)
				0 as lw_contribution_revenue,
				--new Columns from item_plan subquery
			    sum(item_plan.item_plan_units) lw_item_plan_unit, 
			    sum(item_plan.item_plan_revenue) as lw_item_plan_revenue,
			    sum(item_plan.item_plan_margin) as lw_item_plan_margin

				FROM

					(SELECT product_id, date_id,
					--store_reco_level,
--							AVG(COALESCE(aum, 0)) AS aum, AVG(COALESCE(aur, 0)) AS aur, 
SUM(COALESCE(margin, 0)) AS margin, SUM(COALESCE(revenue, 0)) AS revenue,
							SUM(COALESCE(quantity, 0)) AS quantity, 
--AVG(COALESCE(final_amount, 0)) AS final_price, 
AVG(COALESCE(cost, 0)) AS cost,
							AVG(COALESCE(promo_base_price, 0)) AS base_price, AVG(COALESCE(promo_discount, 0)) AS promo_discount, 
							SUM(coalesce(coupon_spend,0)) as coupon_spend
							
					FROM price_promo_opt.%I
					WHERE no_of_txn > 0
					GROUP BY 1, 2--, --3, 4

					) AS txn

					INNER JOIN (SELECT  promo_id, product_id--, store_reco_level
					FROM price_promo_opt.current_finalized_promo_products) AS filter_table USING (product_id)--, store_reco_level)

					--LEFT JOIN price_promo_opt.tb_business_metrics_config_opt USING (store_reco_level)

					LEFT JOIN (SELECT promo_id, offer_distribution_channel, customer_type FROM price_promo.promo_master) prm USING (promo_id)

					-- new join with item_plan
					LEFT JOIN (
		    		SELECT product_id, dates AS date_id, units AS item_plan_units, revenue AS item_plan_revenue, margin AS item_plan_margin 
					FROM price_promo_opt.tb_budget_master_ty
					) AS item_plan
		            ON item_plan.product_id=txn.product_id AND item_plan.date_id=txn.date_id
					GROUP BY promo_id,
					--store_reco_level,
					txn.product_id, txn.date_id;', promo_txn_table_lw

				);

	RAISE NOTICE 'Executing SQL QUERY 2: %', query;

    EXECUTE query;



    query := FORMAT(' DROP TABLE IF EXISTS price_promo_opt_temp.promo_reporting_actual_temp;

    CREATE UNLOGGED TABLE price_promo_opt_temp.promo_reporting_actual_temp AS

    SELECT promo_id, actuals.product_id, 1 as s0_id, 1 ::varchar as s0_name, 1 as s1_id, 1::varchar as s1_name, week_start_date, fw, fy,
           recommendation_date as date, is_default,
           
		   --new columns from item_plan subquery
		   sum(item_plan.item_plan_units) as actual_item_plan_unit, 
		   sum(item_plan.item_plan_revenue) as actual_item_plan_revenue,
		   sum(item_plan.item_plan_margin) as actual_item_plan_margin,		  
           sum(actual_inventory) as actual_inventory,

           SUM(sales_units) AS actual_sales_units, 
		   SUM(revenue) AS actual_revenue, 
		   SUM(margin) AS actual_margin,
		   SUM(coupon_spend) as actual_coupon_spend,

           ROUND(((1 - COALESCE(sum(discounted_price)/NULLIF(sum(original_price), 0), 1)) * 100)::numeric, 2) as actual_discount,
           SUM(baseline_sales_units) AS baseline_sales_units, SUM(baseline_revenue) AS baseline_revenue,
           SUM(baseline_margin) AS baseline_margin, SUM(coalesce(contribution_margin, 0)) AS actual_contribution_margin,
           SUM(coalesce(contribution_revenue, 0)) AS actual_contribution_revenue,
           
           -- New spend columns
           SUM(COALESCE(promo_spend, 0)) AS actual_spend,
           SUM(COALESCE(price_spend, 0)) AS actual_promo_spend

    FROM price_promo.%I actuals

    INNER JOIN (SELECT date_id as recommendation_date, fiscal_week as fw, fiscal_year as fy, simulation_week_start_date as week_start_date

                FROM "global".tb_fiscal_date_mapping) as fd USING (recommendation_date)

    --INNER JOIN (SELECT DISTINCT s0_id::integer store_reco_level::integer s1_id,s0_name, s1_name FROM price_promo.store_master) as sm USING (s1_id, s0_id)

    LEFT JOIN (SELECT -- store_reco_level,
    a.product_id, date_id as recommendation_date, SUM(total_inventory) AS actual_inventory

               FROM price_promo_opt.%I a
left join global.tb_inventory_master b on a.date_id = b.date and a.product_id = b.product_id and a.store_id = b.store_id
GROUP BY --store_reco_level,
               a.product_id, date_id) AS inv USING (product_id, recommendation_date)
--       new join with item_plan
         left join 
    		(   SELECT 
		        product_id, 
		        dates AS date_id, 
		        units AS item_plan_units, 
		        revenue AS item_plan_revenue, 
		        margin AS item_plan_margin
		    FROM price_promo_opt.tb_budget_master_ty
		) AS item_plan
		 ON INV.product_id = item_plan.product_id AND inv.recommendation_date = item_plan.date_id

	LEFT JOIN (SELECT a.promo_id, offer_distribution_channel, customer_type,

                       COALESCE(is_default, false) AS is_default

                   FROM price_promo.promo_master a

                   LEFT JOIN price_promo.tb_promo_override_forecast b

                   ON a.promo_id = b.promo_id AND a.last_approved_scenario_id = b.scenario_id) AS prm

    USING (promo_id)

    GROUP BY promo_id, actuals.product_id, s0_id, s0_name, s1_id, s1_name, week_start_date, fw, fy, recommendation_date, is_default;

	', ps_actuals_table, promo_txn_table);

	RAISE NOTICE 'Executing SQL QUERY3 : %', query;

	EXECUTE query;



    -- Create index on actual base

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_promo_reporting_actual_temp

	ON price_promo_opt_temp.promo_reporting_actual_temp (promo_id, product_id);';









	query := FORMAT(

		'INSERT INTO price_promo.ps_reporting_post_promo_date (

	    promo_id, product_id, s0_id, s0_name, s1_id, s1_name,

	    date, fw, fy, week_start_date,

	    actual_sales_units, lw_sales_units, ly_sales_units,
		actual_coupon_spend, lw_coupon_spend, ly_coupon_spend,
		-- new columns
        actual_item_plan_unit, actual_item_plan_revenue, actual_item_plan_margin,
        ly_item_plan_unit, ly_item_plan_revenue, ly_item_plan_margin,
        lw_item_plan_unit, lw_item_plan_revenue, lw_item_plan_margin,

	    actual_revenue, lw_revenue, ly_revenue,

	    actual_margin, lw_margin, ly_margin,

	    actual_discount, actual_inventory,

	    actual_contribution_revenue, lw_contribution_revenue, ly_contribution_revenue,

	    actual_contribution_margin, lw_contribution_margin, ly_contribution_margin,

	    baseline_sales_units, baseline_revenue, baseline_margin,

	    finalized_sales_units, finalized_revenue, finalized_margin,

	    finalized_contribution_revenue, finalized_contribution_margin,

		-- New spend columns
		finalized_spend, actual_spend, finalized_promo_spend, actual_promo_spend, finalized_coupon_spend,

		fs_sales_units, fs_revenue, fs_margin,

		fso_sales_units, fso_revenue, fso_margin

		)

		(

	    SELECT

	        promo_id, product_id, 1 as s0_id, 1::varchar as s0_name, 1 as s1_id, 1::varchar as s1_name,

	        date, fw, fy, week_start_date,

	        actual_sales_units, COALESCE(lw_sales_units, 0) AS lw_sales_units, COALESCE(ly_sales_units, 0) AS ly_sales_units,
			
			actual_coupon_spend, COALESCE(lw_coupon_spend,0), COALESCE(ly_coupon_spend,0),
	        -- new columns
	        actual_item_plan_unit, COALESCE(actual_item_plan_revenue,0), COALESCE(actual_item_plan_margin,0),
	        ly_item_plan_unit, COALESCE(ly_item_plan_revenue,0), COALESCE(ly_item_plan_margin,0),
	        lw_item_plan_unit, COALESCE(lw_item_plan_revenue,0), COALESCE(lw_item_plan_margin,0),
		   --
			actual_revenue, COALESCE(lw_revenue, 0) AS lw_revenue, COALESCE(ly_revenue, 0) AS ly_revenue,

	        actual_margin, COALESCE(lw_margin, 0) AS lw_margin, COALESCE(ly_margin, 0) AS ly_margin,

	        actual_discount, actual_inventory,

	        actual_contribution_revenue, COALESCE(lw_contribution_revenue, 0) AS lw_contribution_revenue,

			COALESCE(ly_contribution_revenue, 0) AS ly_contribution_revenue,

	        actual_contribution_margin, COALESCE(lw_contribution_margin, 0) AS lw_contribution_margin,

			COALESCE(ly_contribution_margin, 0) AS ly_contribution_margin,

	        baseline_sales_units, baseline_revenue, baseline_margin,

			CASE WHEN is_default THEN fso.finalized_sales_units ELSE fs.finalized_sales_units END AS finalized_sales_units,

			CASE WHEN is_default THEN fso.finalized_revenue ELSE fs.finalized_revenue END AS finalized_revenue,

			CASE WHEN is_default THEN fso.finalized_margin ELSE fs.finalized_margin END AS finalized_margin,

			CASE WHEN is_default THEN fso.finalized_contribution_revenue ELSE fs.finalized_contribution_revenue END AS finalized_contribution_revenue,

			CASE WHEN is_default THEN fso.finalized_contribution_margin ELSE fs.finalized_contribution_margin END AS finalized_contribution_margin,

			-- New spend columns
			CASE WHEN is_default THEN fso.finalized_spend ELSE fs.finalized_spend END AS finalized_spend,
			actual_spend,
			CASE WHEN is_default THEN fso.finalized_promo_spend ELSE fs.finalized_promo_spend END AS finalized_promo_spend,
			actual_promo_spend,
			CASE WHEN is_default THEN fso.finalized_coupon_spend ELSE fs.finalized_coupon_spend END AS finalized_coupon_spend,
			
			fs.finalized_sales_units, fs.finalized_revenue, fs.finalized_margin,

			fso.finalized_sales_units, fso.finalized_revenue, fso.finalized_margin



		    FROM

				price_promo_opt_temp.promo_reporting_actual_temp

		    LEFT JOIN (

		    	SELECT

		    		promo_id, --store_reco_level,
		    		product_id, recommendation_date as date,

		    		SUM(sales_units) AS finalized_sales_units,

		    		SUM(revenue) AS finalized_revenue,

		    		SUM(margin) AS finalized_margin,

					SUM(coalesce(contribution_margin,0)) as finalized_contribution_margin,

					SUM(coalesce(contribution_revenue,0)) as finalized_contribution_revenue,
					
					-- New spend columns
					SUM(COALESCE(promo_spend, 0) - COALESCE(coupon_spend, 0)) AS finalized_promo_spend,
					SUM(COALESCE(promo_spend, 0)) AS finalized_spend,
					SUM(COALESCE(coupon_spend, 0)) AS finalized_coupon_spend

			    	FROM price_promo_opt_temp.fin_stack

			    	GROUP BY promo_id, --store_reco_level,
			    	product_id, recommendation_date

			    ) AS fs using(promo_id, product_id, date)



			 LEFT JOIN (

		    	SELECT

		    		promo_id,-- store_reco_level,
		    		product_id, recommendation_date as date,

		    		SUM(sales_units) AS finalized_sales_units,

		    		SUM(revenue) AS finalized_revenue,

		    		SUM(margin) AS finalized_margin,

					SUM(coalesce(contribution_margin,0)) as finalized_contribution_margin,

					SUM(coalesce(contribution_revenue,0)) as finalized_contribution_revenue,
					
					-- New spend columns
					SUM(COALESCE(promo_spend, 0) - COALESCE(coupon_spend, 0)) AS finalized_promo_spend,
					SUM(COALESCE(promo_spend, 0)) AS finalized_spend,
					SUM(COALESCE(coupon_spend, 0)) AS finalized_coupon_spend

			    	FROM price_promo_opt_temp.fin_stack_override

			    	GROUP BY promo_id, product_id, recommendation_date

			    ) AS fso using(promo_id, product_id, date)



		    LEFT JOIN price_promo_opt_temp.promo_reporting_lw_temp AS lw_data using(promo_id,  product_id)

		    LEFT JOIN price_promo_opt_temp.promo_reporting_ly_temp AS ly_data using(promo_id, product_id)

		);'	);

	RAISE NOTICE 'Executing SQL QUERY FINAL: %', query;

	EXECUTE query;



END;

$procedure$
;

