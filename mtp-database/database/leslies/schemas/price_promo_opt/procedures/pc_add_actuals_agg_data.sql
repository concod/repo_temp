--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_actuals_agg_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_add_actuals_agg_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_add_actuals_agg_data ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_actuals_agg_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	actuals_table TEXT;
	query TEXT;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
    step_start_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE '=== STARTING pc_add_actuals_agg_data for date: % ===', var_date;

	actuals_table := CONCAT('ps_recommended_actuals_', TO_CHAR(var_date, 'yyyymmdd'));

    -- Step 1: Create partitions and delete existing data
    RAISE NOTICE 'Step 1: Creating partitions and cleaning existing data';
    step_start_time := clock_timestamp();
	call price_promo_opt.pc_create_date_partitions('price_promo', 'ps_recommended_actuals_agg', 'day', '14 day', 'backwards');

	DELETE FROM price_promo.ps_recommended_actuals_agg
	WHERE recommendation_date = var_date;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 1 COMPLETED: Partition creation and cleanup took: %', duration;

    -- Step 2: Insert aggregated actuals data
    RAISE NOTICE 'Step 2: Inserting aggregated actuals data';
    step_start_time := clock_timestamp();
	query := FORMAT(
		'INSERT INTO price_promo.ps_recommended_actuals_agg (
			event_id, promo_id, recommendation_date,
			vat_percentage,
			effective_discount, original_price, original_cost, discounted_price, promo_spend,
			coupon_discount, extended_discount, final_spend,
			sales_units, baseline_sales_units, incremental_sales_units,
			revenue, baseline_revenue, incremental_revenue,
			margin, baseline_margin, incremental_margin,
			aur, aum,
			recommendation_type_id, created_by, updated_by, created_at, updated_at,
			contribution_revenue, contribution_margin,
			f_baseline_sales_units, f_baseline_revenue, f_baseline_margin,
			fo_baseline_sales_units, fo_baseline_revenue, fo_baseline_margin,
			fs_baseline_sales_units, fs_baseline_revenue, fs_baseline_margin,
			fs_pos_baseline_sales_units, fs_pos_baseline_revenue, fs_pos_baseline_margin,
			fso_baseline_sales_units, fso_baseline_revenue, fso_baseline_margin,
			fso_pos_baseline_sales_units, fso_pos_baseline_revenue, fso_pos_baseline_margin
		)(
		    SELECT
				event_id, promo_id, recommendation_date,
				max(vat_percentage) as vat_percentage,
				
				ROUND(((1 - COALESCE(sum(discounted_price)/NULLIF(sum(original_price), 0), 1)) * 100)::numeric, 2) as effective_discount,
				round(avg(original_price)::numeric, 2) as original_price,
				round(avg(original_cost)::numeric, 2) as original_cost,
				round(avg(discounted_price)::numeric, 2) as discounted_price,
				round(sum(promo_spend)::numeric, 2) as promo_spend,
				round(sum(coupon_discount)::numeric, 2) as coupon_discount,
				round(sum(extended_discount)::numeric, 2) as extended_discount,
				round(sum(final_spend)::numeric, 2) as final_spend,	
							
				round(sum(sales_units)::numeric, 2) as sales_units,
				round(sum(baseline_sales_units)::numeric, 2) as baseline_sales_units,
				round(sum(incremental_sales_units)::numeric, 2) as incremental_sales_units,

				round(sum(revenue)::numeric, 2) as revenue,
				round(sum(baseline_revenue)::numeric, 2) as baseline_revenue,
				round(sum(incremental_revenue)::numeric, 2) as incremental_revenue,

				round(sum(margin)::numeric, 2) as margin,
				round(sum(baseline_margin)::numeric, 2) as baseline_margin,
				round(sum(incremental_margin)::numeric, 2) as incremental_margin,

				round(COALESCE((sum(revenue)/nullif(sum(sales_units), 0)), 0)::numeric, 2) as aur,
				round(COALESCE((sum(margin)/nullif(sum(sales_units), 0)), 0)::numeric, 2) as aum,

				max(recommendation_type_id) as recommendation_type_id,
				max(created_by) as created_by,
				max(updated_by) as updated_by,
				max(created_at) as created_at,
				max(updated_at) as updated_at,
				round(sum(coalesce(contribution_revenue,0))::numeric,2) as contribution_revenue,
				round(sum(coalesce(contribution_margin,0))::numeric,2) as contribution_margin,

				ROUND(SUM(COALESCE(f_baseline_sales_units, 0))::NUMERIC, 2) AS f_baseline_sales_units,
				ROUND(SUM(COALESCE(f_baseline_revenue, 0))::NUMERIC, 2) AS f_baseline_revenue,
				ROUND(SUM(COALESCE(f_baseline_margin, 0))::NUMERIC, 2) AS f_baseline_margin,

				ROUND(SUM(COALESCE(fo_baseline_sales_units, 0))::NUMERIC, 2) AS fo_baseline_sales_units,
				ROUND(SUM(COALESCE(fo_baseline_revenue, 0))::NUMERIC, 2) AS fo_baseline_revenue,
				ROUND(SUM(COALESCE(fo_baseline_margin, 0))::NUMERIC, 2) AS fo_baseline_margin,

				ROUND(SUM(COALESCE(fs_baseline_sales_units, 0))::NUMERIC, 2) AS fs_baseline_sales_units,
				ROUND(SUM(COALESCE(fs_baseline_revenue, 0))::NUMERIC, 2) AS fs_baseline_revenue,
				ROUND(SUM(COALESCE(fs_baseline_margin, 0))::NUMERIC, 2) AS fs_baseline_margin,

				ROUND(SUM(COALESCE(fs_pos_baseline_sales_units, 0))::NUMERIC, 2) AS fs_pos_baseline_sales_units,
				ROUND(SUM(COALESCE(fs_pos_baseline_revenue, 0))::NUMERIC, 2) AS fs_pos_baseline_revenue,
				ROUND(SUM(COALESCE(fs_pos_baseline_margin, 0))::NUMERIC, 2) AS fs_pos_baseline_margin,

				ROUND(SUM(COALESCE(fso_baseline_sales_units, 0))::NUMERIC, 2) AS fso_baseline_sales_units,
				ROUND(SUM(COALESCE(fso_baseline_revenue, 0))::NUMERIC, 2) AS fso_baseline_revenue,
				ROUND(SUM(COALESCE(fso_baseline_margin, 0))::NUMERIC, 2) AS fso_baseline_margin,

				ROUND(SUM(COALESCE(fso_pos_baseline_sales_units, 0))::NUMERIC, 2) AS fso_pos_baseline_sales_units,
				ROUND(SUM(COALESCE(fso_pos_baseline_revenue, 0))::NUMERIC, 2) AS fso_pos_baseline_revenue,
				ROUND(SUM(COALESCE(fso_pos_baseline_margin, 0))::NUMERIC, 2) AS fso_pos_baseline_margin
		    FROM
		    	price_promo.%I pra
			GROUP BY
		    	event_id, promo_id, recommendation_date
		);', actuals_table
	);
	RAISE NOTICE 'Executing SQL QUERY: %', query;
	EXECUTE query;
    end_time := clock_timestamp();
    duration := end_time - step_start_time;
    RAISE NOTICE 'Step 2 COMPLETED: Data aggregation and insertion took: %', duration;

    -- Calculate overall duration
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE '=== pc_add_actuals_agg_data COMPLETED in: % ===', duration;

END;
$procedure$
;
