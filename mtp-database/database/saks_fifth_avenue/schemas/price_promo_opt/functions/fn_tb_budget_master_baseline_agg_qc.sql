--liquibase formatted sql
--changeset vaibhav@:fn_tb_budget_master_baseline_agg_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_tb_budget_master_baseline_agg_qc

DROP FUNCTION IF EXISTS price_promo_opt.fn_tb_budget_master_baseline_agg_qc(date);

CREATE OR REPLACE FUNCTION price_promo_opt.fn_tb_budget_master_baseline_agg_qc(var_date date DEFAULT NULL::date)
 RETURNS TABLE(check_name text, errors integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
	table_name TEXT;
	query TEXT;
BEGIN
	IF var_date IS NULL THEN
		table_name := 'tb_budget_master_baseline_agg';
	ELSE
		table_name := CONCAT('tb_budget_master_baseline_agg_', TO_CHAR(var_date, 'yyyymmdd'));
	END IF;
	query := FORMAT('
		WITH
			null_chk AS (
				SELECT *
				FROM price_promo_opt.%I
				WHERE
					product_id is NULL
					OR s0_id is NULL
					OR s1_id is NULL
					OR channel is NULL
					OR product_id is NULL
					OR dates is NULL
					OR units is NULL
					OR margin is NULL
					OR revenue is NULL
			),
			data_range_chk AS (
				SELECT *
				FROM price_promo_opt.%I
				WHERE
					revenue < margin
					OR lower(channel) not in (''store'', ''ecom'')
			),
			missing_data_chk AS (
				SELECT *
				FROM (
					SELECT
						s0_id, s1_id, product_id,
						count(distinct dates) AS num_rows,
						(max(dates) - min(dates)) + 1 AS duration
					FROM price_promo_opt.%I
					GROUP BY s0_id, s1_id, product_id
				) AS agg_data
				WHERE num_rows <> duration
			),
			integrity_chk AS (
				SELECT *
				FROM (
					SELECT DISTINCT product_id, s1_id, channel
					FROM price_promo_opt.%I
					) AS base
					LEFT JOIN (
						SELECT DISTINCT product_id, 1 AS pm_chk
						FROM price_promo.product_master
					) AS pm using(product_id)
					LEFT JOIN (
						SELECT DISTINCT s1_id, s1_name as channel, 1 AS tsm_chk
						FROM "global".tb_store_master
					) AS tsm using(s1_id, channel)
				WHERE
					pm_chk IS NULL OR tsm_chk IS null
			),
			data_chk AS (
				SELECT
					s1_id, channel, product_id, dates, bm_baseline,
					CASE WHEN lower(channel) = ''store'' THEN bnm_baseline ELSE ecom_baseline END AS sim_baseline
				FROM (
						SELECT s1_id, channel, product_id, dates, round(units::NUMERIC, 0) AS bm_baseline
						FROM price_promo_opt.%I
					) AS base
					FULL OUTER JOIN (
						SELECT
							product_id, date AS dates,
							round((bnm_baseline_sales_units * bnm_day_split_ratio)::NUMERIC, 0) AS bnm_baseline,
							round((ecom_baseline_sales_units * ecom_day_split_ratio)::NUMERIC, 0) AS ecom_baseline
						FROM (
							SELECT product_id, week_start_date, bnm_baseline_sales_units, ecom_baseline_sales_units
							FROM price_promo_opt.tb_simulation_week_opt tswo
							WHERE base_percentage = 0
						) AS sim
						INNER JOIN (
							select product_id, week_start_date, date, bnm_day_split_ratio, ecom_day_split_ratio
							FROM
								price_promo_opt.tb_day_split_opt tdso
								INNER JOIN (
									SELECT DISTINCT l3_cid, brand_cid, product_id
									FROM price_promo.product_master
									WHERE is_active = 1
								) AS pm USING (l3_cid, brand_cid)
							where date BETWEEN current_date - INTERVAL ''2 week'' AND current_date + INTERVAL ''26 week''
						) AS split_data USING (product_id, week_start_date)
					) AS sim_data USING (product_id, dates)
				WHERE
					bm_baseline IS NULL
					OR bnm_baseline IS NULL
					OR ecom_baseline IS NULL
					OR bm_baseline <> CASE WHEN lower(channel) = ''store'' THEN bnm_baseline ELSE ecom_baseline END
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
