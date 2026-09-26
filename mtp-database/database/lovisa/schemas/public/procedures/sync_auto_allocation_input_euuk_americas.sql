--liquibase formatted sql
--changeset aleena.reji@impactanalytics.co:sync_auto_allocation_input_euuk_americas_v10 runOnChange:true stripComments:false splitStatements:false context:lovisa_inv_smart labels:sync_auto_allocation_input_euuk_americas_v10
--comment: Changeset for sync_auto_allocation_input_euuk_americas_v10
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_auto_allocation_input_euuk_americas();
CREATE OR REPLACE PROCEDURE public.sync_auto_allocation_input_euuk_americas()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code  varchar := gen_random_uuid();
    _sp_name   varchar := 'public.sync_auto_allocation_input_euuk_americas';
    _log_step  varchar;
    _st        TIMESTAMP := clock_timestamp();
    _curr_time TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Australia/Melbourne')::TIME;
BEGIN
    -- Start log
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, TRUE);
    PERFORM set_config('local.sp_name', _sp_name, TRUE);

    -- =====================================================
    -- TIME WINDOW CHECK (FIXED LOGIC)
    -- Allowed window: 10:30 – 14:00 Australia/Melbourne
    -- =====================================================
    IF (
        _curr_time >= TIME '10:30'
        AND _curr_time <= TIME '14:00'
    ) THEN

        BEGIN

            -- ================= EXISTING LOGIC (UNCHANGED) =================
            DROP TABLE IF EXISTS auto_allocation_configuration;
            DROP TABLE IF EXISTS current_cal_info;
            -- DROP TABLE IF EXISTS article_rule_resolution;
            DROP TABLE IF EXISTS article_resolved_dc_store_policy;
            DROP TABLE IF EXISTS article_level_metrics;
            DROP TABLE IF EXISTS article_avg_target_dos;
            DROP TABLE IF EXISTS temp1;
            DROP TABLE IF EXISTS temp2;
            DROP TABLE IF EXISTS temp3;
            DROP TABLE IF EXISTS temp4;
            DROP TABLE IF EXISTS temp5;
            DROP TABLE IF EXISTS temp6;
            DROP TABLE IF EXISTS temp7;
            DROP TABLE IF EXISTS article_list;
            DROP TABLE IF EXISTS res;
            DROP TABLE IF EXISTS aa_input;

           create TEMP TABLE auto_allocation_configuration AS (
						WITH rcl_dc_store_strategy AS MATERIALIZED (
							SELECT
							*
							FROM inventory_smart.rcl_dc_store_policy rdsp
							WHERE
							auto_allocation_rule IS NOT NULL
							AND auto_allocation_schedular IS NOT NULL
						)
						, auto_allocation_scheduler_flat_table AS (
							SELECT
							sh_code,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'end_date'
								)
							) AS end_date,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'start_date'
								)
							) AS start_date,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'dailyRepeatOn'
								)
							) AS dailyRepeatOn,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedWeeks'
								)
							) AS selectedWeeks,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'frequency_type'
								)
							) AS frequency_type,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedMonths'
								)
							) AS selectedMonths,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'end_date_options'
								)
							) AS end_date_options,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'num_of_occurrence'
								)
							) AS num_of_occurrence,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedDaysForYearly'
								)
							) AS selectedDaysForYearly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedDatesForYearly'
								)
							) AS selectedDatesForYearly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedDaysForMonthly'
								)
							) AS selectedDaysForMonthly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedWeeksForYearly'
								)
							) AS selectedWeeksForYearly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedDatesForMonthly'
								)
							) AS selectedDatesForMonthly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedDaysForQuaterly'
								)
							) AS selectedDaysForQuaterly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedMonthsForYearly'
								)
							) AS selectedMonthsForYearly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedWeeksForMonthly'
								)
							) AS selectedWeeksForMonthly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedDatesForQuaterly'
								)
							) AS selectedDatesForQuaterly,
							TRIM(
								'""'
								FROM
								TRIM(
									'[]'
									FROM
									sh_structure -> 'data' ->> 'selectedWeeksForQuarterly'
								)
							) AS selectedWeeksForQuarterly
							FROM inventory_smart.auto_allocation_scheduler aas
							WHERE
							is_deleted = FALSE
							--   AND CASE
							--     WHEN sh_structure -> 'data' ->> 'end_date_options' = 'never_ending' THEN CURRENT_DATE >= (sh_structure -> 'data' ->> 'start_date') :: DATE
							--     ELSE CURRENT_DATE BETWEEN (sh_structure -> 'data' ->> 'start_date') :: DATE
							--     AND (sh_structure -> 'data' ->> 'end_date') :: DATE
							--   END
						)
						, auto_allocation_rules_flat_table AS (
							SELECT
							rule_code,
							threshold_dos_data.dropdown AS ar_threshold_dos_condition,
							threshold_dos_data.threshold AS ar_threshold_dos_threshold,
							CAST(
								VALUES
								-> 'cut_off_dos' AS INT
							) AS ar_cut_off_dos,
							CAST(
								VALUES
								-> 'minimum_dc_inventory' AS INT
							) AS ar_min_dc_inventory,
							CAST(
								VALUES
								-> 'minstock_not_satisfiled' -> 'value' AS BOOL
							) AS ar_minstock_condition,
							auto_allocation_required_data.value AS ar_auto_approve_condition
							FROM inventory_smart.dc_store_policy_user_rule x,
							jsonb_to_record(
								VALUES
								-> 'current_dos'
							) AS threshold_dos_data(dropdown TEXT, threshold FLOAT),
							jsonb_to_record(
								VALUES
								-> 'auto_allocation_required'
							) AS auto_allocation_required_data(value BOOL)
							WHERE
							NOT is_deleted
							AND rule_type = 'auto-allocation'
						)
						SELECT distinct
							dc_store_rule,
							auto_allocation_rule,
							auto_allocation_schedular,
							validity,
							frequency_type AS as_frequency,
							end_date_options AS as_ending_type,
							start_date AS as_start_date,
							end_date AS as_end_date,
							dailyrepeaton AS as_daily_repeat_on,
							selectedweeks AS as_salected_days_of_week,
							selectedmonths AS as_selectedmonths,
							num_of_occurrence AS as_num_of_occurance,
							selecteddaysforyearly AS as_days_for_yearly,
							selecteddatesforyearly AS as_dates_for_yearly,
							selectedweeksforyearly AS as_weeks_for_yearly,
							selectedmonthsforyearly AS as_months_for_yearly,
							selecteddaysforquaterly AS as_days_for_quarterly,
							selecteddatesforquaterly AS as_dates_for_quarterly,
							selectedweeksforquarterly AS as_weeks_for_quarterly,
							selecteddaysformonthly AS as_days_for_monthly,
							selecteddatesformonthly AS as_dates_for_monthly,
							selectedweeksformonthly AS as_weeks_for_monthly,
							ar_threshold_dos_condition,
							ar_threshold_dos_threshold,
							ar_cut_off_dos,
							ar_min_dc_inventory,
							ar_minstock_condition,
							ar_auto_approve_condition
						FROM rcl_dc_store_strategy AS rdss
						JOIN auto_allocation_scheduler_flat_table AS aasft ON rdss.auto_allocation_schedular = aasft.sh_code
						JOIN auto_allocation_rules_flat_table AS aarft ON rdss.auto_allocation_rule = aarft.rule_code
						)	;

					create TEMP TABLE current_cal_info 
					on commit DROP 
					AS (
						SELECT
							date as calendar_date,
							fiscal_day_name AS day,
							CASE
							WHEN fiscal_day_in_week NOT IN (1, 7) THEN 'week_days'
							ELSE 'all_days'
							END AS day_type,
							fiscal_day_in_week AS fiscal_date_of_week,
							fiscal_day_in_month AS fiscal_date_of_month,
							fiscal_week_in_month AS fiscal_week_of_month,
							fiscal_day_in_quarter AS fiscal_date_of_the_quarter,
							fiscal_week_in_quarter AS fiscal_week_of_the_quarter,
							fiscal_month_in_quarter AS fiscal_month_of_the_quarter,
							fiscal_day_in_year AS fiscal_date_of_the_year,
							fiscal_week_in_year AS fiscal_week_of_the_year,
							fiscal_month_in_year AS fiscal_month_of_the_year,
							fiscal_quarter_in_year AS fiscal_quarter_of_the_year
						FROM global.fiscal_date_mapping
						WHERE
							date = CURRENT_DATE
						);

						-- create temp TABLE article_rule_resolution 
						-- on commit DROP 
						-- AS (
						-- SELECT
						-- 	DISTINCT article,
						-- 	rcl_dc_store_policy_code,
						-- 	rcl_code,
						-- 	default_store_groups,
						-- 	default_product_profile,
						-- 	dc_store_rule,
						-- 	auto_allocation_rule,
						-- 	auto_allocation_schedular
						-- FROM inventory_smart.generate_rcl_dc_store_policy(
						-- 	'(
						-- 	SELECT DISTINCT product_code
						-- 	FROM global.product_attributes_filter paf
						-- 	JOIN global.product_time_attributes pta USING(product_code)
						-- 	JOIN (
						-- 		SELECT DISTINCT article
						-- 		FROM inventory_smart.dc_pack_inventory dpi
						-- 	) dpi USING(article)
						-- 	WHERE
						-- 		paf.active = TRUE
						-- 		AND current_date BETWEEN pta.start_time
						-- 		AND pta.end_time
						-- 	)',
						-- 	10003,
						-- 	current_date
						-- )
						-- JOIN global.product_attributes_filter paf USING (product_code)
						-- );
					--select *
					--from article_rule_resolution


					--select *
					--	  FROM auto_allocation_configuration arr --USING (auto_allocation_rule, auto_allocation_schedular)
					--	  JOIN current_cal_info ON (
					--	    CASE
					--	      WHEN as_frequency = 'daily' THEN as_daily_repeat_on = day_type
					--	      ELSE CASE
					--	        WHEN TRIM(as_frequency) = 'weekly' THEN UPPER(as_salected_days_of_week) LIKE CONCAT('%', UPPER(day), '%')
					--	        ELSE CASE
					--	          WHEN as_frequency = 'monthly' THEN CASE
					--	            WHEN as_dates_for_monthly IS NOT NULL THEN CAST(fiscal_date_of_month AS TEXT) = as_dates_for_monthly
					--	            ELSE CAST(fiscal_week_of_month AS TEXT) = as_weeks_for_monthly
					--	              AND UPPER(as_days_for_monthly) LIKE CONCAT('%', UPPER(day), '%')
					--	          END
					--	        END
					--	      END
					--	    END
					--	  )

						CREATE TEMP TABLE article_resolved_dc_store_policy 
						ON COMMIT drop 
						AS (
						SELECT
							auto_allocation_rule,
							auto_allocation_schedular,
							aac.dc_store_rule,
							validity,
							as_frequency,
							as_ending_type,
							as_start_date,
							as_end_date,
							as_daily_repeat_on,
							as_salected_days_of_week,
							as_selectedmonths,
							as_num_of_occurance,
							as_days_for_yearly,
							as_dates_for_yearly,
							as_weeks_for_yearly,
							as_months_for_yearly,
							as_days_for_quarterly,
							as_dates_for_quarterly,
							as_weeks_for_quarterly,
							as_days_for_monthly,
							as_dates_for_monthly,
							as_weeks_for_monthly,
							ar_threshold_dos_condition,
							ar_threshold_dos_threshold,
							ar_cut_off_dos,
							ar_min_dc_inventory,
							ar_minstock_condition,
							ar_auto_approve_condition,
							arr.article,
							rcl_dc_store_policy_code,
							rcl_code,
							default_store_groups,
							default_product_profile,
							calendar_date,
							day,
							day_type,
							fiscal_date_of_week,
							fiscal_date_of_month,
							fiscal_week_of_month,
							fiscal_date_of_the_quarter,
							fiscal_week_of_the_quarter,
							fiscal_month_of_the_quarter,
							fiscal_date_of_the_year,
							fiscal_week_of_the_year,
							fiscal_month_of_the_year
						FROM auto_allocation_configuration aac
						JOIN inventory_smart.rcl_dc_store_policy_results arr USING (auto_allocation_rule, auto_allocation_schedular)
						JOIN current_cal_info ON (
							CASE
							WHEN as_frequency = 'daily' THEN as_daily_repeat_on = day_type
							ELSE CASE
								WHEN TRIM(as_frequency) = 'weekly' THEN UPPER(as_salected_days_of_week) LIKE CONCAT('%', UPPER(day), '%')
								ELSE CASE
								WHEN as_frequency = 'monthly' THEN CASE
									WHEN as_dates_for_monthly IS NOT NULL THEN CAST(fiscal_date_of_month AS TEXT) = as_dates_for_monthly
									ELSE CAST(fiscal_week_of_month AS TEXT) = as_weeks_for_monthly
									AND UPPER(as_days_for_monthly) LIKE CONCAT('%', UPPER(day), '%')
								END
								END
							END
							END
						)
						);


					CREATE TEMP TABLE article_level_metrics  
					ON COMMIT DROP 
					as(
						SELECT
							a.article,
							COALESCE(
							CASE
								WHEN SUM(total_inv) = 0 THEN NULL
								ELSE SUM(dos * total_inv) / SUM(total_inv) -- used fdos instead of dos_oh
							END,
							0
							) AS article_weighted_fdos,
							SUM(oh_pack_qty) AS dc_oh_inv
						FROM inventory_smart.article_inventory_dashboard AS a
						JOIN (
							SELECT
							channel,
							article,
							dc_code,
							oh_pack_qty
							FROM inventory_smart.dc_pack_inventory
						) AS aid USING (article)
						GROUP BY
							1
						) 
						;

						CREATE TEMP TABLE article_avg_target_dos 
						ON COMMIT drop 
						AS (
						SELECT
							ea.article,
							COALESCE(
							CASE
								WHEN SUM(total_inv) = 0 THEN NULL
								ELSE SUM(
								ardsp.ar_threshold_dos_threshold * sscot.target_dos * li.total_inv
								) / SUM(total_inv)
							END,
							0
							) AS article_weighted_tdos
						FROM (
							SELECT
                            DISTINCT a.article
                            FROM inventory_smart.article_inventory_dashboard a
                            JOIN (
                            SELECT
                                DISTINCT article
                            FROM inventory_smart.dc_pack_inventory dpi
                            ) AS b ON a.article = b.article
                        ) AS ea
                        JOIN article_resolved_dc_store_policy ardsp  ON ea.article = ardsp.article
                        JOIN (
                            SELECT
                            DISTINCT paf2.article,
                            frt.product_code,
                            MAX(dos) AS target_dos
                            FROM inventory_smart.final_result_table frt
                            JOIN global.product_attributes_filter paf2 ON frt.product_code = paf2.product_code
                            JOIN (
                            SELECT
                                DISTINCT article
                            FROM inventory_smart.dc_pack_inventory dpi2
                            ) dpi2 ON paf2.article = dpi2.article
                            GROUP BY
                            1,
                            2
                        ) AS sscot ON ea.article = sscot.article
                        LEFT JOIN (
                            SELECT
                            li.product_code,
                            SUM(oh + oo + it) AS total_inv
                            FROM inventory_smart.latest_inventory li
                            JOIN global.product_attributes_filter paf ON li.product_code = paf.product_code
                            GROUP BY
                            1
                        ) AS li ON sscot.product_code = li.product_code
                        GROUP BY
                            1
						);

					CREATE TEMP TABLE temp5 
					ON COMMIT drop 
					AS (
						SELECT
							A.article
						FROM article_resolved_dc_store_policy A,
							article_level_metrics B,
							article_avg_target_dos c
						WHERE
							A.article = b.article
							AND b.article = c.article
						);

					CREATE TEMP table temp4 
					ON COMMIT drop 
					AS (
						select
								paf1.article,
								paf1.product_code,
								store_code,
								coalesce(sum(oh + it + oo),0) total_inv
							from inventory_smart.psm_inventory li
						join global.product_attributes_filter paf1
							using (product_code)
						where article IN (
							SELECT
							article
							FROM temp5
						)
						GROUP BY
								paf1.article,
								paf1.product_code,
							store_code
						);


						create temp TABLE temp1 
						ON COMMIT drop 
						AS (
						SELECT
							DISTINCT alm.article,
							alm.article_weighted_fdos,
							alm.dc_oh_inv,
							aasot.auto_allocation_rule,
							aasot.auto_allocation_schedular,
							aasot.ar_threshold_dos_condition,
							aasot.ar_threshold_dos_threshold,
							aasot.ar_cut_off_dos,
							aasot.ar_min_dc_inventory,
							aasot.ar_minstock_condition,
							aasot.ar_auto_approve_condition,
							SUM(
							CASE
								WHEN (li.total_inv) < sscot.min_stock THEN 1
								ELSE 0
							END
							) OVER (PARTITION BY alm.article) AS minstock_counts,
							CASE
							WHEN aasot.ar_cut_off_dos IS NOT NULL THEN CASE
								WHEN alm.article_weighted_fdos <= aasot.ar_cut_off_dos THEN 1
								ELSE 0
							END
							ELSE -1
							END AS cut_off_dos_flag,
							CASE
							WHEN aasot.ar_minstock_condition IS NOT NULL THEN CASE
								WHEN aasot.ar_minstock_condition IS TRUE THEN SUM(
								CASE
									WHEN li.total_inv < sscot.min_stock THEN 1
									ELSE 0
								END
								) OVER (PARTITION BY alm.article)
								ELSE 0
							END
							ELSE -1
							END AS min_stock_flag,
							CASE
							WHEN aasot.ar_min_dc_inventory IS NOT NULL THEN CASE
								WHEN alm.dc_oh_inv >= aasot.ar_min_dc_inventory THEN 1
								ELSE 0
							END
							ELSE -1
							END AS min_dc_inventory_flag,
							CASE
							WHEN (aasot.ar_threshold_dos_threshold IS NOT NULL) AND (aasot.ar_threshold_dos_condition = 'lt') THEN CASE
								WHEN alm.article_weighted_fdos < aatw.article_weighted_tdos THEN 1
								ELSE 0
							END
							WHEN (aasot.ar_threshold_dos_threshold IS NOT NULL) AND (aasot.ar_threshold_dos_condition = 'gte') THEN CASE
								WHEN alm.article_weighted_fdos >= aatw.article_weighted_tdos THEN 1
								ELSE 0
							END
							ELSE -1
							END AS cutoff_dos_threshold_flag
						FROM article_level_metrics AS alm
						JOIN article_resolved_dc_store_policy AS aasot USING (article)
						JOIN temp4 AS li USING (article)
						JOIN article_avg_target_dos AS aatw USING (article)
						JOIN (select distinct product_code,AVG(min_stock) as min_stock from inventory_smart.final_result_table group by 1) AS sscot ON li.product_code = sscot.product_code --AND li.store_code = sscot.store_code 
						);

						create temp table  temp2 
					ON COMMIT drop 
					AS (
						SELECT
							*,
							CASE
							WHEN GREATEST(
								cut_off_dos_flag,
								min_stock_flag,
								min_dc_inventory_flag,
								cutoff_dos_threshold_flag
							) > -1 THEN 0
							ELSE 1
							END AS no_condition_flag
						FROM temp1 a
						);

					create temp TABLE temp3 
					ON COMMIT drop 
					AS (
						SELECT
							*,
							CASE
							WHEN no_condition_flag = 0 AND (
								cut_off_dos_flag <> 0
								AND min_stock_flag <> 0
								AND min_dc_inventory_flag <> 0
								AND cutoff_dos_threshold_flag <> 0
							) THEN 1
							ELSE 0
							END AS condition_flag
						FROM temp2 b
						);

						create temp TABLE res 
						ON COMMIT drop 
						AS (
						SELECT
							*,
							condition_flag + no_condition_flag AS final_flag
						FROM temp3 c
						);

						create temp TABLE article_list 
						ON COMMIT drop 
						AS (
						SELECT
							DISTINCT article
						FROM res
						WHERE
							final_flag = 1
						);

						create temp TABLE temp6 
						ON COMMIT drop 
						AS (
						SELECT
							DISTINCT paf.l0_name,
							paf.l4_name,
							paf.range_name,
							paf.article,
							ar_auto_approve_condition
						FROM global.product_attributes_filter paf
						JOIN global.product_time_attributes pta USING (product_code)
						JOIN (
							SELECT
							DISTINCT article
							FROM inventory_smart.dc_pack_inventory dpi
						) AS b USING (article)
						JOIN (
							SELECT
							DISTINCT article,
							ar_auto_approve_condition
							FROM article_resolved_dc_store_policy
						) a USING (article)
						WHERE
							attribute_value = 'active'
							AND current_date BETWEEN start_time
							AND end_time
							AND article IN (
							SELECT
								article
							FROM article_list
							)
						);

						create temp TABLE temp7 
						ON COMMIT drop 
						AS (
						SELECT
							DISTINCT a.l0_name,
							a.l4_name,
							a.range_name,
							a.article,
							ar_auto_approve_condition AS auto_approve_flag,
							ROW_NUMBER() OVER (
							PARTITION BY a.range_name
							) AS style_rn
						FROM temp6 AS a
						ORDER BY
							1,
							2,
							3,
							4,
							5,
							6
						);

					CREATE TEMP TABLE aa_input
					ON COMMIT DROP AS
					WITH base AS (
						-- Work at the atomic level: each article + its l0 + l4
						SELECT DISTINCT
							range_name,
							l0_name,
							l4_name,
							article
						FROM temp7 aid  -- temp7 t7
						join (select distinct Product_code from inventory_smart.final_result_table) b on aid.article = b.product_code --and aid.store_code = b.store_code
					where oh_dc>0
					),
					numbered AS (
						-- Give each article within a range a sequence number
						SELECT
							range_name,
							l0_name,
							l4_name,
							article,
							ROW_NUMBER() OVER (
								PARTITION BY range_name
								ORDER BY article
							) AS rn
						FROM base
						where article in (select distinct product_code from inventory_smart.product_profile_mapping )
						and article in (select distinct product_code from global.product_attributes_filter b where b.active = true
										and b.l0_name in ('EUUK', 'AMERICAS') )
					),
					batched AS (
						-- Batch into chunks of 25 per range_name
						SELECT
							range_name,
							l0_name,
							l4_name,
							article,
							(rn - 1) / 25 AS batch_id
						FROM numbered
					),
					l0_batch AS (
						-- For each (range_name, batch_id, l0_name) get the list of articles (already tagged with region)
						SELECT
							range_name,
							batch_id,
							l0_name,
							ARRAY_AGG(DISTINCT article ORDER BY article) AS article_array
						FROM batched
						GROUP BY range_name, batch_id, l0_name
					),
					article_per_batch AS (
						-- For each (range_name, batch_id) get the list of articles (with -AFRICA/-ASIA)
						SELECT
							range_name,
							batch_id,
							ARRAY_AGG(DISTINCT article ORDER BY article) AS article_list
						FROM batched
						GROUP BY range_name, batch_id
					),
					map_per_batch AS (
						-- For each (range_name, batch_id) build the JSON map l0_name -> [article...]
						SELECT
							range_name,
							batch_id,
							JSONB_OBJECT_AGG(l0_name, article_array) AS l0_name_article_list_map
						FROM l0_batch
						GROUP BY range_name, batch_id
					),
					-- 🔹 l0_name -> store_group (array of sg_code)
					store_group_def AS (
						SELECT 
							CASE 
								WHEN name = 'AMERICAS Stores' THEN 'AMERICAS'
								WHEN name = 'AUSNZ Stores'    THEN 'AUSNZ'
								WHEN name = 'AFRICA Stores'   THEN 'AFRICA'
								WHEN name = 'EUUK Stores'     THEN 'EUUK'
								WHEN name = 'ASIA Stores'     THEN 'ASIA'
							END AS l0_name,
							ARRAY_AGG(DISTINCT sg_code) AS store_group
						FROM global.store_groups a
						JOIN "global".store_groups_mapping d USING (sg_code)
						WHERE sg_code IN (1, 2, 3, 4, 5)
						GROUP BY 1
					),

					-- 🔹 For each (range_name, batch_id) build JSON: article -> [sg_code...]
					store_groups_per_batch AS (
						SELECT
							b.range_name,
							b.batch_id,
							JSONB_OBJECT_AGG(b.article, s.store_group) AS store_groups
						FROM batched b
						JOIN store_group_def s USING (l0_name)
						GROUP BY b.range_name, b.batch_id
					),

					final AS (
						SELECT
							a.range_name,
							a.batch_id,
							a.article_list,
							m.l0_name_article_list_map,
							sg.store_groups
						FROM article_per_batch a
						JOIN map_per_batch m
						ON a.range_name = m.range_name
						AND a.batch_id  = m.batch_id
						LEFT JOIN store_groups_per_batch sg
						ON sg.range_name = a.range_name
						AND sg.batch_id  = a.batch_id
						ORDER BY a.range_name, a.batch_id
					)

					SELECT
						a.range_name,
						a.batch_id AS row_num,
						a.article_list,
						a.l0_name_article_list_map,
						a.store_groups,                     -- 👈 new jsonb column
						FALSE AS auto_approve_flag,
						0 AS int_div,
						user_code,
						CONCAT(
							'9_',
							user_code, '_', 'Auto_Allocation','_',a.range_name, '_',
							TO_CHAR(NOW() AT TIME ZONE 'Australia/Melbourne', 'YYYYMMDDHH24MISS'),
							'_', batch_id, '_', '1' -- auto_approve_no
						) AS allocation_code,
						1 AS auto_approve_no,
						NULL AS allocation_status,
						updated_at
					FROM final a
					CROSS JOIN global.user_master b
					WHERE b.email IN ('ia_system@impactanalytics.co') 
					ORDER BY a.batch_id;


            -- taking backup of auto_allocation_input table before deleting
            INSERT INTO inventory_smart.auto_allocation_input_backup (
                range_name,
                row_num,
                article_list,
                l0_name_article_list_map,
                auto_approve_flag,
                int_div,
                user_code,
                allocation_code,
                auto_approve_no,
                allocation_status,
                updated_at,
                store_groups,
                batch_number,
                backup_at
            )
            SELECT
                range_name,
                row_num,
                article_list,
                l0_name_article_list_map,
                auto_approve_flag,
                int_div,
                user_code,
                allocation_code,
                auto_approve_no,
                allocation_status,
                updated_at,
                store_groups,
                batch_number,
                NOW()
            FROM inventory_smart.auto_allocation_input;

            DELETE FROM inventory_smart.auto_allocation_input;

            INSERT INTO inventory_smart.auto_allocation_input (
                range_name,
                row_num,
                article_list,
                l0_name_article_list_map,
                auto_approve_flag,
                int_div,
                user_code,
                allocation_code,
                auto_approve_no,
                allocation_status,
                updated_at,
                store_groups,
                batch_number
            )
            SELECT
                range_name,
                row_num,
                article_list,
                l0_name_article_list_map,
                auto_approve_flag,
                int_div,
                user_code,
                REPLACE(allocation_code, ' ', '_') AS allocation_code,
                auto_approve_no,
                NULL,
                NOW(),
                store_groups,
                2
            FROM aa_input;

            -- Success log
            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                'end',
                NULL,
                (clock_timestamp() - _st)::text,
                NULL
            );

        EXCEPTION
            WHEN OTHERS THEN
                CALL global.data_ingestion_logs(
                    _log_code,
                    _sp_name,
                    _log_step,
                    SQLERRM,
                    (clock_timestamp() - _st)::text,
                    NULL
                );
                RAISE;
        END;

    ELSE
        -- =====================================================
        -- SKIPPED DUE TO TIME WINDOW
        -- =====================================================
        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'skipped',
            'Outside execution window (10:30–14:00 Australia/Melbourne)',
            (clock_timestamp() - _st)::text,
            NULL
        );
    END IF;

END;
$procedure$
;