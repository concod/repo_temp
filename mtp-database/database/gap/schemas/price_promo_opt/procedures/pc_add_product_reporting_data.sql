--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_product_reporting_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_product_reporting_data

DROP PROCEDURE if exists price_promo_opt.pc_add_product_reporting_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_product_reporting_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

	reporting_table TEXT;

	query TEXT;

BEGIN

	reporting_table := CONCAT('ps_reporting_post_promo_date_', TO_CHAR(var_date, 'yyyymmdd'));



	call price_promo_opt.pc_create_date_partitions('price_promo', 'ps_reporting_post_hierarchy_date', 'day', '14 day', 'backwards');



	DELETE FROM price_promo.ps_reporting_post_hierarchy_date

	WHERE date = var_date;



	query := FORMAT(

		'INSERT INTO price_promo.ps_reporting_post_hierarchy_date (

			promo_id, product_id, s0_id, s0_name, s1_id, s1_name,

			date, fw, fy, week_start_date,

			actual_sales_units, finalized_sales_units, baseline_sales_units,

			actual_revenue, finalized_revenue, baseline_revenue,

			actual_margin, finalized_margin, baseline_margin,

			lw_sales_units, lw_revenue, lw_margin,

			ly_sales_units, ly_revenue, ly_margin,

			actual_discount, actual_inventory,
			----
			actual_item_plan_unit  ,
			actual_item_plan_revenue  ,
			actual_item_plan_margin  ,
			ly_item_plan_unit  ,
			ly_item_plan_revenue  ,
			ly_item_plan_margin  ,
			lw_item_plan_unit  ,
			lw_item_plan_revenue  ,
			lw_item_plan_margin  ,
			
			----

			actual_contribution_revenue, finalized_contribution_revenue, actual_contribution_margin, finalized_contribution_margin,

				lw_contribution_revenue, lw_contribution_margin, ly_contribution_revenue, ly_contribution_margin,
				actual_coupon_spend, lw_coupon_spend, ly_coupon_spend,

				-- New spend columns
				finalized_spend, actual_spend, finalized_promo_spend, actual_promo_spend, finalized_coupon_spend

		)(

		    SELECT

		    	array_agg(distinct promo_id order by promo_id) as promo_id,

				product_id, 1 as s0_id, 1::varchar as s0_name, 1 as s1_id, 1::varchar as s1_name,

				date, fw, fy, week_start_date,

				MAX(actual_sales_units) AS actual_sales_units,

				MAX(finalized_sales_units) AS finalized_sales_units,

				MAX(baseline_sales_units) AS baseline_sales_units,

				MAX(actual_revenue) AS actual_revenue,

				MAX(finalized_revenue) AS finalized_revenue,

				MAX(baseline_revenue) AS baseline_revenue,

				MAX(actual_margin) AS actual_margin,

				MAX(finalized_margin) AS finalized_margin,

				MAX(baseline_margin) AS baseline_margin,

				MAX(lw_sales_units) AS lw_sales_units,

				MAX(lw_revenue) AS lw_revenue,

				MAX(lw_margin) AS lw_margin,

				MAX(ly_sales_units) AS ly_sales_units,

				MAX(ly_revenue) AS ly_revenue,

				MAX(ly_margin) AS ly_margin,

				MAX(actual_discount) AS actual_discount,

				MAX(actual_inventory) AS actual_inventory,

				ROUND(MAX(COALESCE(actual_item_plan_unit, 0))::NUMERIC, 2) AS actual_item_plan_unit,

				ROUND(MAX(COALESCE(actual_item_plan_revenue, 0))::NUMERIC, 2) AS actual_item_plan_revenue,
				ROUND(MAX(COALESCE(actual_item_plan_margin, 0))::NUMERIC, 2) AS actual_item_plan_margin,
				ROUND(MAX(COALESCE(ly_item_plan_unit, 0))::NUMERIC, 2) AS ly_item_plan_unit,
				ROUND(MAX(COALESCE(ly_item_plan_revenue, 0))::NUMERIC, 2) AS ly_item_plan_revenue,
				ROUND(MAX(COALESCE(ly_item_plan_margin, 0))::NUMERIC, 2) AS ly_item_plan_margin,
				ROUND(MAX(COALESCE(lw_item_plan_unit, 0))::NUMERIC, 2) AS lw_item_plan_unit,
				ROUND(MAX(COALESCE(lw_item_plan_revenue, 0))::NUMERIC, 2) AS lw_item_plan_revenue,
				ROUND(MAX(COALESCE(lw_item_plan_margin, 0))::NUMERIC, 2) AS lw_item_plan_margin,

			    ROUND(MAX(COALESCE(actual_contribution_revenue, 0))::NUMERIC, 2) AS actual_contribution_revenue,

			    ROUND(MAX(COALESCE(finalized_contribution_revenue, 0))::NUMERIC, 2) AS finalized_contribution_revenue,

			    ROUND(MAX(COALESCE(actual_contribution_margin, 0))::NUMERIC, 2) AS actual_contribution_margin,

			    ROUND(MAX(COALESCE(finalized_contribution_margin, 0))::NUMERIC, 2) AS finalized_contribution_margin,

			    ROUND(MAX(COALESCE(lw_contribution_revenue, 0))::NUMERIC, 2) AS lw_contribution_revenue,

			    ROUND(MAX(COALESCE(lw_contribution_margin, 0))::NUMERIC, 2) AS lw_contribution_margin,

			    ROUND(MAX(COALESCE(ly_contribution_revenue, 0))::NUMERIC, 2) AS ly_contribution_revenue,

			    ROUND(MAX(COALESCE(ly_contribution_margin, 0))::NUMERIC, 2) AS ly_contribution_margin,
				
				 MAX(actual_coupon_spend) AS actual_coupon_spend,
   			     MAX(lw_coupon_spend) AS lw_coupon_spend,
        		 MAX(ly_coupon_spend) AS ly_coupon_spend,

        		 -- New spend columns
        		 ROUND(MAX(COALESCE(finalized_spend, 0))::NUMERIC, 2) AS finalized_spend,
        		 ROUND(MAX(COALESCE(actual_spend, 0))::NUMERIC, 2) AS actual_spend,
        		 ROUND(MAX(COALESCE(finalized_promo_spend, 0))::NUMERIC, 2) AS finalized_promo_spend,
        		 ROUND(MAX(COALESCE(actual_promo_spend, 0))::NUMERIC, 2) AS actual_promo_spend,
        		 ROUND(MAX(COALESCE(finalized_coupon_spend, 0))::NUMERIC, 2) AS finalized_coupon_spend


		    FROM

		    	price_promo.%I

		    GROUP BY

				product_id, s0_id, s0_name, s1_id, s1_name, date, fw, fy, week_start_date

		);', reporting_table

	);

	RAISE NOTICE 'Executing SQL QUERY: %', query;

	EXECUTE query;

END;

$procedure$
;

