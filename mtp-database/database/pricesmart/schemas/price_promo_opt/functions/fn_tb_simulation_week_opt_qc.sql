--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_tb_simulation_week_opt_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_tb_simulation_week_opt_qc

DROP FUNCTION if exists price_promo_opt.fn_tb_simulation_week_opt_qc;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_tb_simulation_week_opt_qc()
 RETURNS TABLE(check_name text, errors integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
	table_name TEXT;
	query TEXT;
BEGIN
	table_name := 'tb_simulation_week_opt';
	query := FORMAT('
		WITH
			null_chk AS (
				SELECT *
				FROM price_promo_opt.%I
				WHERE
					product_id is NULL
					OR week_start_date is NULL
					OR base_percentage is NULL
					OR bnm_sales_units is NULL
					OR bnm_baseline_sales_units is NULL
					OR bnm_elasticity is NULL
					OR bnm_product_split_ratio is NULL
					OR ecom_sales_units is NULL
					OR ecom_baseline_sales_units is NULL
					OR ecom_elasticity is NULL
					OR ecom_product_split_ratio is NULL
			),
			data_range_chk AS (
				SELECT *
				FROM (
					SELECT
						week_start_date, l3_cid, brand_cid,
						min(bnm_sales_units) as min_bnm_sales,
						min(bnm_baseline_sales_units) as min_bnm_baseline,
						min(bnm_elasticity) as min_bnm_elasticity,
						min(ecom_sales_units) as min_ecom_sales,
						min(ecom_baseline_sales_units) as min_ecom_baseline,
						min(ecom_elasticity) as min_ecpm_elasticity,
						min(bnm_product_split_ratio) as min_bnm_ratio,
						max(bnm_product_split_ratio) as max_bnm_ratio,
						sum(bnm_product_split_ratio)/20 as total_bnm_ratio,
						min(ecom_product_split_ratio) as min_ecom_ratio,
						max(ecom_product_split_ratio) as max_ecom_ratio,
						sum(ecom_product_split_ratio)/20 as total_ecom_ratio
					FROM
						price_promo_opt.%I as sim
						INNER JOIN (
							SELECT l3_cid, brand_cid, product_id
							FROM price_promo.product_master
						) as pm using (product_id)
					GROUP BY week_start_date, l3_cid, brand_cid
				) as sim_data
				WHERE
					l3_cid is null
					OR brand_cid is NULL
					OR min_bnm_sales < 0
					OR min_bnm_baseline < 0
					OR min_bnm_elasticity < 1
					OR min_ecom_sales < 0
					OR min_ecom_baseline < 0
					OR min_ecpm_elasticity < 1
					OR min_bnm_ratio < 0
					OR max_bnm_ratio > 1
					OR ROUND(total_bnm_ratio::numeric, 2) > 1
					OR min_ecom_ratio < 0
					OR max_ecom_ratio > 1
					OR ROUND(total_ecom_ratio::numeric, 2) > 1
			),
			missing_data_chk AS (
				SELECT *
				FROM (
					SELECT
						product_id,
						count(distinct week_start_date) AS num_rows,
						(max(week_start_date) - min(week_start_date))/7 + 1 AS duration
					FROM price_promo_opt.%I
					GROUP BY product_id
				) AS agg_data
				WHERE num_rows <> duration
			),
			integrity_chk AS (
				SELECT *
				FROM (
						SELECT DISTINCT product_id
						FROM price_promo_opt.%I
					) AS base
					LEFT JOIN (
						SELECT DISTINCT product_id, 1 AS pm_chk
						FROM price_promo.product_master
					) AS pm using(product_id)
				WHERE pm_chk IS NULL
			),
			data_chk AS (
				SELECT *
				FROM (
					SELECT
						product_id,
						count(*) AS total_points,
						min(base_percentage) as min_point,
						max(base_percentage) as max_point,
						sum(base_percentage) as sum_points
					FROM (
							SELECT product_id
							FROM price_promo.product_master
							WHERE is_active = 1
						) AS tsm
						LEFT JOIN (
							SELECT DISTINCT product_id, base_percentage, 1 AS prod_chk
							FROM price_promo_opt.%I
						) AS base using(product_id)
					GROUP BY product_id
				) as prod_data
				WHERE
					total_points <> 20
					or min_point <> 0
					or max_point <> 95
					or sum_points <> 950
			),
			combined_queries AS (
			SELECT ''null_chk'' AS check_name, count(*) AS errors
			FROM null_chk
			UNION ALL
			SELECT ''data_range_chk'' AS check_name, count(*) AS errors
			FROM data_range_chk
			UNION ALL
			SELECT ''missing_data_chk'' AS check_name, count(*) AS errors
			FROM missing_data_chk
			UNION ALL
			SELECT ''integrity_chk'' AS check_name, count(*) AS errors
			FROM integrity_chk
			UNION ALL
			SELECT ''data_chk'' AS check_name, count(*) AS errors
			FROM data_chk
			)
		SELECT
			check_name::text as check_name,
			errors::INTEGER as errors
		FROM combined_queries
		;', table_name, table_name, table_name, table_name, table_name);
	RAISE NOTICE 'Executing SQL QUERY: %', query;
	RETURN QUERY EXECUTE query;
END;
$function$



;