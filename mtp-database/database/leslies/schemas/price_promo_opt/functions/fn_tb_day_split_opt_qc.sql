--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_tb_day_split_opt_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_tb_day_split_opt_qc

DROP FUNCTION IF EXISTS price_promo_opt.fn_tb_day_split_opt_qc ;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_tb_day_split_opt_qc()
 RETURNS TABLE(check_name text, errors integer)
 LANGUAGE plpgsql
AS $function$

DECLARE

	table_name TEXT;

	query TEXT;

BEGIN

	table_name := 'tb_day_split_opt';

	query := FORMAT('

		WITH

			null_chk AS (

				SELECT *

				FROM price_promo_opt.%I

				WHERE

					l3_cid is NULL

					OR brand_cid is NULL

					OR date is NULL

					OR week_start_date is NULL

					OR bnm_day_split_ratio is NULL

					OR ecom_day_split_ratio is NULL

			),

			data_range_chk AS (

				SELECT *

				FROM (

					SELECT

						week_start_date, l3_cid, brand_cid,

						min(bnm_day_split_ratio) as min_bnm_ratio,

						max(bnm_day_split_ratio) as max_bnm_ratio,

						sum(bnm_day_split_ratio) as total_bnm_ratio,

						min(ecom_day_split_ratio) as min_ecom_ratio,

						max(ecom_day_split_ratio) as max_ecom_ratio,

						sum(ecom_day_split_ratio) as total_ecom_ratio

					FROM price_promo_opt.%I

					GROUP BY week_start_date, l3_cid, brand_cid

				) as data

				WHERE

					min_bnm_ratio < 0

					or max_bnm_ratio > 1

					or round(total_bnm_ratio::numeric, 2) > 1

					or min_ecom_ratio < 0

					or max_ecom_ratio > 1

					or round(total_ecom_ratio::numeric, 2) > 1

			),

			missing_data_chk AS (

				SELECT *

				FROM (

					SELECT

						l3_cid, brand_cid,

						count(distinct date) AS num_rows,

						(max(date) - min(date)) + 1 AS duration

					FROM price_promo_opt.%I

					GROUP BY l3_cid, brand_cid

				) AS agg_data

				WHERE num_rows <> duration

			),

			integrity_chk AS (

				SELECT *

				FROM (

						SELECT DISTINCT l3_cid, brand_cid

						FROM price_promo_opt.%I

					) AS base

					LEFT JOIN (

						SELECT DISTINCT l3_cid, brand_cid, 1 AS pm_chk

						FROM price_promo.product_master

					) AS pm using(l3_cid, brand_cid)

				WHERE pm_chk IS NULL

			),

			data_chk AS (

				SELECT *

				FROM (

						SELECT DISTINCT l3_cid, brand_cid

						FROM price_promo.product_master

						WHERE is_active = 1

					) AS tsm

					LEFT JOIN (

						SELECT DISTINCT l3_cid, brand_cid, 1 AS prod_chk

						FROM price_promo_opt.%I

					) AS base using(l3_cid, brand_cid)

				WHERE

					prod_chk IS NULL

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
