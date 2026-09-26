--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_inventory_data_promo_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_inventory_data_promo_qc

DROP FUNCTION if exists price_promo_opt.fn_inventory_data_promo_qc;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_inventory_data_promo_qc(var_date date DEFAULT NULL::date)
 RETURNS TABLE(check_name text, errors integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
	table_name TEXT;
	query TEXT;
BEGIN
	IF var_date IS NULL THEN
		table_name := 'inventory_data_promo';
	ELSE
		table_name := CONCAT('inventory_data_promo_', TO_CHAR(var_date, 'yyyymmdd'));
	END IF;
	query := FORMAT('
		WITH
			null_chk AS (
				SELECT *
				FROM price_promo.%I
				WHERE
					date_id is NULL
					OR parent_id is NULL
					OR product_id is NULL
					OR s0_id is NULL
					OR s1_id is NULL
					OR channel is NULL
					OR on_hand_qty is NULL
					OR in_transit_qty is NULL
					OR oo_qty is NULL
					OR vendor_oo_qty is NULL
					OR total_qty is NULL
			),
			data_range_chk AS (
				SELECT *
				FROM price_promo.%I
				WHERE
					(on_hand_qty + in_transit_qty + oo_qty + vendor_oo_qty) <> total_qty
					OR lower(channel) not in (''store'', ''ecom'')
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
					SELECT DISTINCT product_id, s0_id, s1_id
					FROM price_promo.%I
					) AS base
					LEFT JOIN (
						SELECT DISTINCT product_id, 1 AS pm_chk
						FROM price_promo.product_master
					) AS pm using(product_id)
					LEFT JOIN (
						SELECT DISTINCT s0_id, s1_id, 1 AS tsm_chk
						FROM "global".tb_store_master
					) AS tsm using(s0_id, s1_id)
				WHERE
					pm_chk IS NULL OR tsm_chk IS null
			),
			data_chk AS (
				SELECT *
				FROM (
						SELECT DISTINCT product_id
						FROM price_promo.product_master
						WHERE is_active = 1
					) AS pm
					LEFT JOIN (
						SELECT DISTINCT product_id, 1 AS prod_chk
						FROM price_promo.%I
					) AS base using(product_id)
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