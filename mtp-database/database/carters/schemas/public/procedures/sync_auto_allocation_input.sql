-- liquibase formatted sql
-- changeset aman_lakkoju_:sync_auto_allocation_input_updates updated_style_count_per_plan runOnChange:true stripComments:false splitStatements:false context:sync_auto_allocation_input labels:sync_auto_allocation_input_eligibility
-- comment: sync_auto_allocation_input_updates

DROP PROCEDURE if exists public.sync_auto_allocation_input();
CREATE OR REPLACE PROCEDURE public.sync_auto_allocation_input()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_auto_allocation_input';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin


DROP TABLE IF EXISTS auto_allocation_configuration;
drop table if exists current_cal_info;
drop table if exists article_rule_resolution;
drop table if exists article_resolved_dc_store_policy;
drop table if exists article_level_metrics;
drop table if exists article_avg_target_wos;
drop table if exists temp1;
drop table if exists temp2;
drop table if exists temp3;
drop table if exists temp4;
drop table if exists temp5;
drop table if exists temp6;
drop table if exists temp7;
drop table if exists article_list;
drop table if exists res;
drop table if exists aa_input ;



create TEMP TABLE auto_allocation_configuration ON COMMIT drop AS (
  WITH rcl_dc_store_strategy AS MATERIALIZED (
    SELECT
      *
    FROM
      inventory_smart.rcl_dc_store_policy rdsp
    WHERE
      auto_allocation_rule IS NOT NULL
      AND auto_allocation_schedular IS NOT NULL
  ),
  
  
  auto_allocation_scheduler_flat_table AS (
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
    FROM
      inventory_smart.auto_allocation_scheduler aas
    WHERE
      is_deleted = FALSE
  ),
  
  
  auto_allocation_rules_flat_table AS (
    SELECT
      rule_code,
      threshold_wos_data.dropdown AS ar_threshold_wos_condition,
      threshold_wos_data.threshold AS ar_threshold_wos_threshold,
      rule_expression,
      CAST(
        VALUES
          -> 'cut_off_wos' AS INT
      ) AS ar_cut_off_wos,
      CAST(
        VALUES
          -> 'minimum_dc_inventory' AS INT
      ) AS ar_min_dc_inventory,
      CAST(
        VALUES
          -> 'minstock_not_satisfiled' -> 'value' AS BOOL
      ) AS ar_minstock_condition,
      auto_allocation_required_data.value AS ar_auto_approve_condition
    FROM
      inventory_smart.dc_store_policy_user_rule x,
      jsonb_to_record(
        VALUES
          -> 'current_wos'
      ) AS threshold_wos_data(dropdown TEXT, threshold FLOAT),
      jsonb_to_record(
        VALUES
          -> 'auto_allocation_required'
      ) AS auto_allocation_required_data(value BOOL)
    WHERE
      NOT is_deleted
      AND rule_type = 'auto-allocation'
  )
  
  SELECT
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
    ar_threshold_wos_condition,
    ar_threshold_wos_threshold,
    ar_cut_off_wos,
    ar_min_dc_inventory,
    ar_minstock_condition,
    ar_auto_approve_condition,
    rule_expression
  FROM
    rcl_dc_store_strategy AS rdss
    JOIN auto_allocation_scheduler_flat_table AS aasft ON rdss.auto_allocation_schedular = aasft.sh_code
    JOIN auto_allocation_rules_flat_table AS aarft ON rdss.auto_allocation_rule = aarft.rule_code
);


CREATE TEMP TABLE current_cal_info  ON COMMIT drop AS (
  SELECT
    calendar_date,
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
  FROM
    global.fiscal_date_mapping
  WHERE
    calendar_date = CURRENT_DATE 
);
CREATE TEMP TABLE article_rule_resolution ON COMMIT DROP AS (
  SELECT
    DISTINCT article,
    rcl_dc_store_policy_code,
    rcl_code,
    default_store_groups,
    default_product_profile,
    dc_store_rule,
    auto_allocation_rule,
    auto_allocation_schedular
  FROM
    inventory_smart.generate_rcl_dc_store_policy(
      '(
    SELECT
      DISTINCT product_code
    FROM
      global.product_attributes_filter paf
    JOIN
      global.product_time_attributes pta
    USING
      (product_code)
    JOIN (
      SELECT
        DISTINCT article
      FROM
        inventory_smart.dc_pack_inventory dpi) dpi
    USING
      (article)
    WHERE
      paf.active = TRUE
      AND current_date BETWEEN pta.start_time
      AND pta.end_time
      
      
      )',
      10003,
      current_date
    )
    JOIN global.product_attributes_filter paf USING (product_code)
) ;

CREATE TEMP TABLE article_resolved_dc_store_policy ON COMMIT drop AS (
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
    ar_threshold_wos_condition,
    ar_threshold_wos_threshold,
    ar_cut_off_wos,
    ar_min_dc_inventory,
    ar_minstock_condition,
    ar_auto_approve_condition,
    article,
    rcl_dc_store_policy_code,
    rcl_code,
    rule_expression,
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
  FROM
    auto_allocation_configuration aac
    JOIN article_rule_resolution arr USING (
      auto_allocation_rule,
      auto_allocation_schedular
    )
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
CREATE TEMP TABLE article_level_metrics  ON COMMIT DROP as (
  SELECT
    article,
    COALESCE(
      CASE
        WHEN SUM(total_inv) = 0 THEN NULL
        ELSE SUM(wos_oh * total_inv) / SUM(total_inv)
      END,
      0
    ) AS article_weighted_fwos,
    SUM(oh_pack_qty) AS dc_oh_inv
  FROM
    inventory_smart.article_inventory_dashboard AS a
    JOIN (
      SELECT
        channel,
        article,
        dc_code,
        oh_pack_qty
      FROM
        inventory_smart.dc_pack_inventory
    ) AS aid USING (article)
  GROUP BY
    1
) ;
CREATE TEMP TABLE article_avg_target_wos ON COMMIT drop AS (
  SELECT
    article,
    COALESCE(
      CASE
        WHEN SUM(total_inv) = 0 THEN NULL
        ELSE SUM(
          ardsp.ar_threshold_wos_threshold * sscot.target_wos * li.total_inv
        ) / SUM(total_inv)
      END,
      0
    ) AS article_weighted_twos
  FROM
    (
      SELECT
        DISTINCT article
      FROM
        inventory_smart.article_inventory_dashboard
        JOIN (
          SELECT
            DISTINCT article
          FROM
            inventory_smart.dc_pack_inventory dpi
        ) AS b USING (article)
    ) AS ea
    JOIN article_resolved_dc_store_policy ardsp USING (article)
    JOIN (
      SELECT
        DISTINCT paf2.article,
        product_code,
        MAX(wos) AS target_wos
      FROM
        inventory_smart.final_result_table
        JOIN global.product_attributes_filter paf2 USING (product_code)
        JOIN (
          SELECT
            DISTINCT article
          FROM
            inventory_smart.dc_pack_inventory dpi2
        ) dpi2 USING (article)
      GROUP BY
        1,
        2
    ) AS sscot USING (article)
    LEFT JOIN (
      SELECT
        product_code,
        SUM(oh + oo + it) AS total_inv
      FROM
        inventory_smart.latest_inventory li
        JOIN global.product_attributes_filter paf USING (product_code)
      GROUP BY
        1
    ) AS li USING (product_code)
  GROUP BY
    1
)  ;
CREATE TEMP TABLE temp5 ON COMMIT drop AS (
  SELECT
    A.article
  FROM
    article_resolved_dc_store_policy A,
    article_level_metrics B,
    article_avg_target_wos c
  WHERE
    A.article = b.article
    AND b.article = c.article
);
CREATE TEMP TABLE temp4 ON COMMIT drop AS (
  select
    article,
    product_code,
    store_code,
    coalesce(sum(total_inv), 0) total_inv
  from
    inventory_smart.psm_inventory
  where
    article IN (
      SELECT
        article
      FROM
        temp5
    )
  GROUP BY
    article,
    product_code,
    store_code
);

--select * from temp4

CREATE TEMP TABLE temp1 ON COMMIT drop AS (
  SELECT
    DISTINCT alm.article,
    alm.article_weighted_fwos,
    alm.dc_oh_inv,
    aasot.auto_allocation_rule,
    aasot.auto_allocation_schedular,
    aasot.ar_threshold_wos_condition,
    aasot.ar_threshold_wos_threshold,
    aasot.ar_cut_off_wos,
    aasot.ar_min_dc_inventory,
    aasot.ar_minstock_condition,
    aasot.ar_auto_approve_condition,
    aasot.rule_expression,
    SUM(
      CASE
        WHEN (li.total_inv) < sscot.min_stock THEN 1
        ELSE 0
      END
    ) OVER (PARTITION BY alm.article) AS minstock_counts,
    CASE
      WHEN aasot.ar_cut_off_wos IS NOT NULL THEN CASE
        WHEN alm.article_weighted_fwos <= aasot.ar_cut_off_wos THEN 1
        ELSE 0
      END
      ELSE -1
    END AS cut_off_wos_flag,
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
      WHEN (aasot.ar_threshold_wos_threshold IS NOT NULL)
      AND (aasot.ar_threshold_wos_condition = 'lt') THEN CASE
        WHEN alm.article_weighted_fwos < aatw.article_weighted_twos THEN 1
        ELSE 0
      END
      WHEN (aasot.ar_threshold_wos_threshold IS NOT NULL)
      AND (aasot.ar_threshold_wos_condition = 'gte') THEN CASE
        WHEN alm.article_weighted_fwos >= aatw.article_weighted_twos THEN 1
        ELSE 0
      END
      ELSE -1
    END AS cutoff_wos_threshold_flag
  FROM
    article_level_metrics AS alm
    JOIN article_resolved_dc_store_policy AS aasot USING (article)
    LEFT JOIN temp4 AS li USING (article)
    JOIN article_avg_target_wos AS aatw USING (article)
    JOIN inventory_smart.final_result_table AS sscot USING (product_code, store_code)
) ;

--select * from temp1


CREATE TEMP TABLE temp2 ON COMMIT drop AS (
  SELECT
    *,
    CASE
      WHEN (rule_expression IS NULL OR cardinality(rule_expression)=0) THEN
        CASE
          WHEN GREATEST(cut_off_wos_flag, min_stock_flag, min_dc_inventory_flag, cutoff_wos_threshold_flag) > -1 THEN 0
          ELSE 1
        END
      ELSE 0
    END AS no_condition_flag,
    (cut_off_wos_flag          > 0) AS leaf_cutoff,
    (cutoff_wos_threshold_flag > 0) AS leaf_wosthresh,
    (min_dc_inventory_flag     > 0) AS leaf_mindc,
    (min_stock_flag            > 0) AS leaf_minstock
  FROM
    temp1 a
) ;
CREATE TEMP TABLE temp3 ON COMMIT DROP AS (
  SELECT
    *,
    CASE
      WHEN rule_expression IS NOT NULL  THEN
        CASE WHEN inventory_smart.eval_rule_ast(
                    rule_expression,
                    leaf_cutoff,
                    leaf_wosthresh,
                    leaf_mindc,
                    leaf_minstock
                 )
             THEN 1 ELSE 0 END
      ELSE
        CASE
          WHEN no_condition_flag = 0 AND (
            cut_off_wos_flag > 0
            OR min_stock_flag > 0
            OR min_dc_inventory_flag > 0
            OR cutoff_wos_threshold_flag > 0
          ) THEN 1 ELSE 0 END
    END AS condition_flag
  FROM
    temp2 b
) ;
CREATE TEMP TABLE res ON COMMIT DROP AS (
  SELECT
    *,
    condition_flag + no_condition_flag AS final_flag
  FROM
    temp3 c
) ;
CREATE TEMP TABLE article_list  ON COMMIT drop AS (
  SELECT
    DISTINCT article
  FROM
    res
  WHERE
    final_flag = 1
    and article in (
    select distinct rcl_dimension :: json ->> 'article' from global.rcl_product_mapping_product_store rpmps join global.rcl_product_mapping_product_store_rule rpmpsr 
	using (rcl_code, rule_code) 
	where validity @> current_date
	and psa_name in (
	select distinct store_code from global.store_groups_mapping
	where sg_code in  ('504', '503')))
 
) ;
CREATE TEMP TABLE temp6 ON COMMIT drop AS (
  SELECT
    DISTINCT paf.l0_name,
    paf.l1_name,
    paf.l2_name,
    paf.l3_name,
    paf.l4_name,
    paf.l5_name,
	paf.clearance_flag,
    ar_auto_approve_condition,
    paf.style
  FROM
    global.product_attributes_filter paf
    JOIN global.product_time_attributes pta USING (product_code)
    JOIN (
      SELECT
        DISTINCT article
      FROM
        inventory_smart.dc_pack_inventory dpi
    ) AS b USING (article)
    JOIN (
      SELECT
        DISTINCT article,
        ar_auto_approve_condition
      FROM
        article_resolved_dc_store_policy
    ) a USING (article)
  WHERE
    attribute_value = 'active'
    AND current_date BETWEEN start_time
    AND end_time
    AND l1_name <> 'E-Commerce'
    AND article IN (
      SELECT
        article
      FROM
        article_list
    )
    and product_life_cycle not in ('Pre Launch')
) ;
CREATE TEMP TABLE temp7 ON COMMIT drop AS (
  SELECT
    DISTINCT 'dc' AS allocation_type,
    a.l0_name AS country,
    a.l1_name AS channel,
    a.l2_name AS brand,
    a.l3_name AS sbu,
    a.l4_name AS department,
    a.l5_name AS collection_total,
	a.clearance_flag,
    ar_auto_approve_condition AS auto_approve_flag,
    style,
    ROW_NUMBER() OVER (
      PARTITION BY a.l0_name,
      a.l1_name,
      a.l2_name,
      a.l3_name,
      a.l4_name,
      a.l5_name,
	  a.clearance_flag
      ORDER BY
        style
    ) AS style_rn
  FROM
    temp6 AS a
  Order by 
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,10
) ;


CREATE TEMP TABLE aa_input  ON COMMIT drop AS (
SELECT
  a.*,
  CONCAT( '6_', a.user_code, '_', a.country,'_',TO_CHAR(NOW(), 'YYYYMMDD"T"HH24MISSUS'),a.row_num,a.auto_approve_no) AS allocation_code
FROM
  (
      SELECT
      *,
       LPAD(ROW_NUMBER() OVER (
        ORDER BY allocation_type, country, channel, brand, sbu, department, 
                 collection_total,clearance_flag, auto_approve_flag, int_div, user_code
    )::TEXT, 3, '0') AS row_num
    FROM
      (
        select
          allocation_type,
          country,
          channel,
          brand,
          sbu,
          department,
          collection_total,
		  clearance_flag,
          auto_approve_flag,
          int_div,
          user_code,
          CASE
            WHEN auto_approve_flag THEN 1 ELSE 0
          END AS auto_approve_no,
          MAX(style_rn) AS total_style_count,
          COUNT(DISTINCT style) AS style_count_per_row,
          ARRAY_AGG(style) AS style_list
        FROM
          (
            select
              allocation_type,
              country,
              channel,
              brand,
              sbu,
              department,
              collection_total,
			  clearance_flag,
              COALESCE(auto_approve_flag, FALSE) AS auto_approve_flag,
              style,
              style_rn,
              (style_rn / 31) AS int_div,
              user_code
            FROM
              temp7 AS a
              CROSS JOIN global.user_master
            WHERE
              email in ('ia_system@impactanalytics.co')           
             ) AS b
        GROUP BY
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12
      ) AS a
  ) AS a
 ) ;
 
delete from inventory_smart.auto_allocation_input
where true;

INSERT INTO inventory_smart.auto_allocation_input (
  allocation_type,
  country,
  channel,
  brand,
  sbu,
  department,
  collection_total,
  clearance_flag,
  auto_approve_flag,
  int_div,
  user_code,
  auto_approve_no,
  total_style_count,
  style_count_per_row,
  style_list,
  row_num,
  allocation_code,
  po_id
)
SELECT 
  allocation_type,
  country,
  channel,
  brand,
  sbu,
  department,
  collection_total,
  clearance_flag,
  auto_approve_flag,
  int_div,
  user_code,
  auto_approve_no,
  total_style_count,
  style_count_per_row,
  style_list,
  row_num,
  allocation_code,
  null as po_id
FROM aa_input;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;