--liquibase formatted sql
--changeset vaibhav@:fn_qc_checks runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_qc_checks

DROP FUNCTION IF EXISTS price_promo_opt.fn_qc_checks(text, date);

CREATE OR REPLACE FUNCTION price_promo_opt.fn_qc_checks(var_type text DEFAULT 'complete'::text, var_date date DEFAULT NULL::date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
	pivot_query text;
	final_query text;
	qc_status text;
BEGIN
	IF var_type = 'derived' OR var_type = 'complete' THEN
		DELETE FROM price_promo_opt.qc_results WHERE table_type = 'derived';
		DELETE FROM price_promo_opt.qc_results_pivot WHERE table_type = 'derived';
		INSERT INTO price_promo_opt.qc_results (
			check_date, table_type, table_name, check_name, errors
		)(
			SELECT
				current_date AS check_date, 'derived' AS table_type,
				'promo_txn' AS table_name, *
			FROM price_promo_opt.fn_promo_txn_qc(var_date)
		);
		INSERT INTO price_promo_opt.qc_results (
			check_date, table_type, table_name, check_name, errors
		)(
			SELECT
				current_date AS check_date, 'derived' AS table_type,
				'promo_txn_basket' AS table_name, *
			FROM price_promo_opt.fn_promo_txn_basket_qc(var_date)
		);
		INSERT INTO price_promo_opt.qc_results (
			check_date, table_type, table_name, check_name, errors
		)(
			SELECT
				current_date AS check_date, 'derived' AS table_type,
				'inventory_data_promo' AS table_name, *
			FROM price_promo_opt.fn_inventory_data_promo_qc(var_date)
		);
		INSERT INTO price_promo_opt.qc_results (
			check_date, table_type, table_name, check_name, errors
		)(
			SELECT
				current_date AS check_date, 'derived' AS table_type,
				'budget_master_baseline_agg' AS table_name, *
			FROM price_promo_opt.fn_tb_budget_master_baseline_agg_qc(var_date)
		);
		INSERT INTO price_promo_opt.qc_results (
			check_date, table_type, table_name, check_name, errors
		)(
			SELECT
				current_date AS check_date, 'derived' AS table_type,
				'tb_store_split_opt' AS table_name, *
			FROM price_promo_opt.fn_tb_store_split_opt_qc()
		);
		INSERT INTO price_promo_opt.qc_results (
			check_date, table_type, table_name, check_name, errors
		)(
			SELECT
				current_date AS check_date, 'derived' AS table_type,
				'tb_day_split_opt' AS table_name, *
			FROM price_promo_opt.fn_tb_day_split_opt_qc()
		);
		INSERT INTO price_promo_opt.qc_results (
			check_date, table_type, table_name, check_name, errors
		)(
			SELECT
				current_date AS check_date, 'derived' AS table_type,
				'tb_simulation_week_opt' AS table_name, *
			FROM price_promo_opt.fn_tb_simulation_week_opt_qc()
		);
	ELSEIF var_type = 'opt' OR var_type = 'complete' THEN
		DELETE FROM price_promo_opt.qc_results WHERE table_type = 'opt';
	END IF;

	pivot_query := '
		INSERT INTO price_promo_opt.qc_results_pivot (
			check_date, table_type, table_name, total_errors,
			null_chk, data_range_chk, missing_data_chk, integrity_chk, data_chk
		)(
			SELECT
			    check_date,
			    table_type,
			    table_name,
			    (null_chk + data_range_chk + missing_data_chk + integrity_chk + data_chk) AS total_errors,
			    null_chk, data_range_chk, missing_data_chk, integrity_chk, data_chk
			FROM (
				SELECT
				    check_date,
				    table_type,
				    table_name,
				    MAX(CASE WHEN check_name = ''null_chk'' THEN errors END) AS null_chk,
				    MAX(CASE WHEN check_name = ''data_range_chk'' THEN errors END) AS data_range_chk,
				    MAX(CASE WHEN check_name = ''missing_data_chk'' THEN errors END) AS missing_data_chk,
				    MAX(CASE WHEN check_name = ''integrity_chk'' THEN errors END) AS integrity_chk,
				    COALESCE(MAX(CASE WHEN check_name = ''data_chk'' THEN errors END), 0) AS data_chk
				FROM
					price_promo_opt.qc_results
				GROUP BY
				    check_date,
				    table_type,
				    table_name
				ORDER BY
				    check_date,
				    table_type,
				    table_name
			) AS qc_data
		)
	;';
	RAISE NOTICE 'Executing SQL QUERY: %', pivot_query;
	EXECUTE pivot_query;

	IF var_type = 'complete' THEN
		SELECT CASE WHEN sum(total_errors) = 0 then 1 else 0 end as status
		INTO qc_status
		FROM price_promo_opt.qc_results_pivot;
	ELSEIF var_type = 'derived' THEN
		SELECT CASE WHEN sum(total_errors) = 0 then 1 else 0 end as status
		INTO qc_status
		FROM price_promo_opt.qc_results_pivot
		WHERE table_type = 'derived';
	ELSE
		SELECT CASE WHEN sum(total_errors) = 0 then 1 else 0 end as status
		INTO qc_status
		FROM price_promo_opt.qc_results_pivot
		WHERE table_type = 'opt';
	END IF;

	RETURN qc_status;
END;
$function$
;
