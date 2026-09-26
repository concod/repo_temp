--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_tb_store_split_opt_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_tb_store_split_opt_qc

DROP FUNCTION if exists price_promo_opt.fn_tb_store_split_opt_qc;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_tb_store_split_opt_qc()
 RETURNS TABLE(check_name text, errors integer)
 LANGUAGE plpgsql
AS $function$

DECLARE

	table_name TEXT;

	query TEXT;

BEGIN

	table_name := 'tb_store_split_opt';

	query := FORMAT('

		WITH

			null_chk AS (

				SELECT *

				FROM price_promo_opt.%I

				WHERE

					l3_cid is NULL

					OR brand_cid is NULL

					OR store_id is NULL

					OR s0_id is NULL

					OR s1_id is NULL

					OR week_start_date is NULL

					OR store_split_ratio is NULL

			),

			data_range_chk AS (

				SELECT *

				FROM (

					SELECT

						week_start_date, l3_cid, brand_cid, s1_id,

						min(store_split_ratio) as min_ratio,

						max(store_split_ratio) as max_ratio,

						sum(store_split_ratio) as total_ratio

					FROM price_promo_opt.%I

					GROUP BY week_start_date, l3_cid, brand_cid, s1_id

				) as data

				WHERE

					min_ratio < 0

					or max_ratio > 1

					or round(total_ratio::numeric, 2) > 1

			),

			missing_data_chk AS (

				SELECT *

				FROM (

					SELECT

						store_reco_level, l3_cid, brand_cid,

						count(distinct week_start_date) AS num_rows,

						(max(week_start_date) - min(week_start_date))/7 + 1 AS duration

					FROM price_promo_opt.%I

					GROUP BY store_reco_level, l3_cid, brand_cid

				) AS agg_data

				WHERE num_rows <> duration

			),

			integrity_chk AS (

				SELECT *

				FROM (

						SELECT DISTINCT l3_cid, brand_cid, store_reco_level, store_id

						FROM price_promo_opt.%I

					) AS base

					LEFT JOIN (

						SELECT DISTINCT l3_cid, brand_cid, 1 AS pm_chk

						FROM price_promo.product_master

					) AS pm using(l3_cid, brand_cid)

					LEFT JOIN (

						SELECT DISTINCT store_reco_level, store_id, 1 AS tsm_chk

						FROM "global".tb_store_master

					) AS tsm using(store_reco_level, store_id)

				WHERE

					pm_chk IS NULL OR tsm_chk IS null

			),

			data_chk AS (

				SELECT *

				FROM (

						SELECT DISTINCT store_id

						FROM "global".tb_store_master

					) AS tsm

					LEFT JOIN (

						SELECT DISTINCT store_id, 1 AS store_chk

						FROM price_promo_opt.%I

					) AS base using(store_id)

				WHERE

					store_chk IS NULL

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

