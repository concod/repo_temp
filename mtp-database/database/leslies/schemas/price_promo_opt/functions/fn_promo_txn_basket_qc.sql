--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_promo_txn_basket_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_promo_txn_basket_qc

DROP FUNCTION IF EXISTS price_promo_opt.fn_promo_txn_basket_qc ;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_promo_txn_basket_qc(var_date date DEFAULT NULL::date)
 RETURNS TABLE(check_name text, errors integer)
 LANGUAGE plpgsql
AS $function$

DECLARE

	table_name TEXT;

	query TEXT;

BEGIN

	IF var_date IS NULL THEN

		table_name := 'promo_txn_basket';

	ELSE

		table_name := CONCAT('promo_txn_basket_', TO_CHAR(var_date, 'yyyymmdd'));

	END IF;

	query := FORMAT('

		WITH

			null_chk AS (

				SELECT *

				FROM price_promo.%I

				WHERE

					quantity > 0

					AND (

						product_id is NULL

						OR base_price is NULL

						OR retail_price is NULL

						OR quantity is NULL

						OR revenue is NULL

						OR margin is NULL

						OR aur is NULL

						OR aum is NULL

						OR final_price is NULL

						OR final_discount_percent is NULL

					)

			),

			data_range_chk AS (

				SELECT *

				FROM price_promo.%I

				WHERE

					quantity > 0

					AND (

						margin > revenue

						OR (cost >= base_price AND clearance_indicator = 0)

						OR (cost >= retail_price AND clearance_indicator = 0)

						OR aum > aur

						OR final_discount_percent < 0

						OR final_discount_percent > 100

						OR (cost > final_price AND (aum > 0 OR margin > 0))

					)

			),

			missing_data_chk AS (

				SELECT *

				FROM (

					SELECT

						s0_id, s1_id, product_id,

						count(distinct date_id) AS num_rows,

						(max(date_id) - min(date_id)) + 1 AS duration

					FROM price_promo.%I

					GROUP BY s0_id, s1_id, product_id

				) AS agg_data

				WHERE num_rows <> duration

			),

			integrity_chk AS (

				SELECT *

				FROM (

						SELECT DISTINCT product_id, s0_id, s1_id, store_id

						FROM price_promo.%I

						WHERE date_id BETWEEN current_date - INTERVAL ''1 month'' AND current_date

					) AS base

					LEFT JOIN (

						SELECT DISTINCT product_id, 1 AS pm_chk

						FROM price_promo.product_master

					) AS pm using(product_id)

					LEFT JOIN (

						SELECT DISTINCT s0_id, s1_id, store_id, 1 AS tsm_chk

						FROM "global".tb_store_master

					) AS tsm using(s0_id, s1_id, store_id)

				WHERE

					pm_chk IS NULL OR tsm_chk IS null

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

			)

		SELECT

			check_name::text as check_name,

			errors::INTEGER as errors

		FROM combined_queries

		;', table_name, table_name, table_name, table_name);

	RAISE NOTICE 'Executing SQL QUERY: %', query;

	RETURN QUERY EXECUTE query;

END;

$function$
;
