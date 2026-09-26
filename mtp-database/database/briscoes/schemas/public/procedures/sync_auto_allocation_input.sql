--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:sync_auto_allocation_input_nested runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_sp
--comment: initial changeset for sync_article_status_tag
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_auto_allocation_input();

-- DROP PROCEDURE public.sync_auto_allocation_input();

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
DROP TABLE IF EXISTS current_cal_info;
DROP TABLE IF EXISTS article_rule_resolution;
DROP TABLE IF EXISTS article_resolved_dc_store_policy;
DROP TABLE IF EXISTS article_level_metrics;
DROP TABLE IF EXISTS article_dc_metrics;
DROP TABLE IF EXISTS article_avg_target_wos;
DROP TABLE IF EXISTS resolved_article_list;
DROP TABLE IF EXISTS resolved_product_store_inv;
DROP TABLE IF EXISTS flag_tagging;
DROP TABLE IF EXISTS flag_resolve_base;
DROP TABLE IF EXISTS flag_resolve;
DROP TABLE IF EXISTS flag_resolve_final;
DROP TABLE IF EXISTS article_list;
DROP TABLE IF EXISTS nested_base_article;
DROP TABLE IF EXISTS article_level_metrics_nested;
DROP TABLE IF EXISTS article_dc_metrics_nested;
DROP TABLE IF EXISTS article_avg_target_wos_nested;
DROP TABLE IF EXISTS resolved_article_list_nested;
DROP TABLE IF EXISTS resolved_product_store_inv_nested;
DROP TABLE IF EXISTS flag_tagging_nested;
DROP TABLE IF EXISTS flag_resolve_base_nested;
DROP TABLE IF EXISTS flag_resolve_nested;
DROP TABLE IF EXISTS flag_resolve_final_nested;
DROP TABLE IF EXISTS article_list_nested;
DROP TABLE IF EXISTS aa_level;
DROP TABLE IF EXISTS aa_level_style_count;
DROP TABLE IF EXISTS aa_input ;

CREATE TEMP TABLE auto_allocation_configuration ON COMMIT DROP AS (
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
  , auto_allocation_rules_flat_table  AS (
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
      -- CAST(VALUES -> 'auto_allocation_required' AS BOOL) AS ar_auto_approve_condition,
      auto_release_required_data.value AS ar_auto_release_condition
    FROM inventory_smart.dc_store_policy_user_rule x,
      jsonb_to_record(
        VALUES
          -> 'current_wos'
      ) AS threshold_wos_data(dropdown TEXT, threshold FLOAT),
      jsonb_to_record(
        VALUES
          -> 'auto_release_required'
      ) AS auto_release_required_data(value BOOL)
    WHERE
      NOT is_deleted
      AND rule_type = 'auto-allocation'
  )
  SELECT distinct
    dc_store_rule,
    auto_allocation_rule,
    auto_allocation_schedular,
    rcl_dc_store_policy_code,
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
  --   ar_auto_approve_condition,
      ar_auto_release_condition,
      rule_expression
  FROM rcl_dc_store_strategy AS rdss
  JOIN auto_allocation_scheduler_flat_table AS aasft ON rdss.auto_allocation_schedular = aasft.sh_code
  JOIN auto_allocation_rules_flat_table AS aarft ON rdss.auto_allocation_rule = aarft.rule_code	
);
--	 select * from auto_allocation_configuration

CREATE TEMP TABLE	current_cal_info ON COMMIT DROP AS (
  SELECT
    date as calendar_date,
    fiscal_day_name AS day,
    CASE
      WHEN fiscal_day_in_week NOT IN (6, 7) THEN 'week_days'
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
    date = date((now() AT TIME ZONE 'Pacific/Auckland')) 
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
  FROM inventory_smart.generate_rcl_dc_store_policy(
    '(
      SELECT DISTINCT product_code
      FROM global.product_attributes_filter paf
      JOIN global.product_time_attributes pta USING(product_code)
      JOIN (
        SELECT DISTINCT article
        FROM inventory_smart.article_inventory_dashboard dpi
    where oh_dc>0
      ) dpi USING(article)
      WHERE
        paf.active = TRUE
        AND current_date BETWEEN pta.start_time
        AND pta.end_time
    )',
    10003,
    date((now() AT TIME ZONE 'Pacific/Auckland'))
  )
  JOIN global.product_attributes_filter paf USING (product_code)
);
--select * from article_rule_resolution

CREATE TEMP TABLE article_resolved_dc_store_policy ON COMMIT DROP AS (
  select
    auto_allocation_rule,
    auto_allocation_schedular,
    aac.dc_store_rule,
    aac.rcl_dc_store_policy_code,
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
    -- ar_auto_approve_condition,
    ar_auto_release_condition,
    article,
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
  FROM auto_allocation_configuration aac
  JOIN article_rule_resolution arr USING (auto_allocation_rule, auto_allocation_schedular,rcl_dc_store_policy_code)
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
--select * from article_resolved_dc_store_policy

CREATE TEMP TABLE article_level_metrics ON COMMIT DROP AS (
  SELECT
    DISTINCT article,
    store_code,
    wos_oh as article_weighted_fwos
  FROM inventory_smart.article_inventory_dashboard
  WHERE store_code not like 'DC%'
);

CREATE TEMP TABLE article_dc_metrics ON COMMIT DROP AS (
  SELECT
    article,
    sum(case when oh_pack_qty>0 then oh_pack_qty else 0 end) as dc_oh_inv
  FROM inventory_smart.dc_pack_inventory
  GROUP BY 1
);

CREATE TEMP TABLE article_avg_target_wos ON COMMIT DROP AS (
  SELECT
    article,
    store_code,
    ardsp.ar_threshold_wos_threshold * sscot.target_wos as article_weighted_twos 
  FROM (
    SELECT
      DISTINCT article
    FROM inventory_smart.article_inventory_dashboard
    JOIN (
      SELECT
        DISTINCT article
      FROM inventory_smart.dc_pack_inventory dpi
    ) AS b USING (article)
  ) AS ea
  JOIN article_resolved_dc_store_policy ardsp USING (article)
  JOIN (
    SELECT
      DISTINCT paf2.article,
      store_code,
      MAX(wos) AS target_wos
    FROM inventory_smart.final_result_table
    JOIN global.product_attributes_filter paf2 USING (product_code)
    JOIN (
      SELECT
        DISTINCT article
      FROM inventory_smart.dc_pack_inventory dpi2
    ) dpi2 
    on paf2.article = dpi2.article
--    USING (article)
    GROUP BY
      1,
      2   
  ) AS sscot USING (article)
);

CREATE TEMP TABLE resolved_article_list ON COMMIT DROP AS (
  SELECT 
    DISTINCT a.article
  FROM article_resolved_dc_store_policy a
  JOIN article_level_metrics b USING(article)
  JOIN article_avg_target_wos c USING(article)
);

CREATE TEMP TABLE resolved_product_store_inv ON COMMIT DROP AS (
  SELECT
    article,
    product_code,
    store_code,
    coalesce(sum(oh+oo+it),0) total_inv
  FROM inventory_smart.latest_inventory
  LEFT JOIN global.product_attributes_filter USING(product_code)
  WHERE article IN (
    SELECT
      article
    FROM resolved_article_list
  )
  GROUP BY
    article,
    product_code,
    store_code
);

CREATE TEMP TABLE flag_tagging ON COMMIT DROP AS (
  SELECT
    DISTINCT alm.article,
    alm.article_weighted_fwos,
    adm.dc_oh_inv,
    aasot.auto_allocation_rule,
    aasot.auto_allocation_schedular,
    aasot.ar_threshold_wos_condition,
    aasot.ar_threshold_wos_threshold,
    aasot.ar_cut_off_wos,
    aasot.ar_min_dc_inventory,
    aasot.ar_minstock_condition,
    aasot.rule_expression,
    -- aasot.ar_auto_approve_condition,
    aasot.ar_auto_release_condition,
    SUM(
      CASE
        WHEN (li.total_inv) < sscot.min_stock THEN 1
        ELSE 0
      END
    ) OVER (PARTITION BY alm.article) AS minstock_counts,
    CASE
      WHEN aasot.ar_cut_off_wos IS NOT NULL THEN SUM ( 
        CASE
          WHEN alm.article_weighted_fwos <= aasot.ar_cut_off_wos THEN 1
          ELSE 0
        END
      ) OVER (PARTITION BY alm.article)
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
        WHEN adm.dc_oh_inv >= aasot.ar_min_dc_inventory THEN 1
        ELSE 0
      END
      ELSE -1
    END AS min_dc_inventory_flag,
    CASE
      WHEN (aasot.ar_threshold_wos_threshold IS NOT NULL) AND (aasot.ar_threshold_wos_condition = 'lt') THEN SUM( 
        CASE
          WHEN alm.article_weighted_fwos < aatw.article_weighted_twos THEN 1
          ELSE 0 
        END
      ) OVER (PARTITION BY alm.article)
      WHEN (aasot.ar_threshold_wos_threshold IS NOT NULL) AND (aasot.ar_threshold_wos_condition = 'gte') THEN SUM(
        CASE
          WHEN alm.article_weighted_fwos >= aatw.article_weighted_twos THEN 1
          ELSE 0
        END
      ) OVER (PARTITION BY alm.article)
      ELSE -1
    END AS cutoff_wos_threshold_flag
  FROM article_level_metrics AS alm
  JOIN article_resolved_dc_store_policy AS aasot USING (article)
  LEFT JOIN resolved_product_store_inv AS li USING (article,store_code)
  JOIN article_avg_target_wos AS aatw USING (article,store_code)
  JOIN inventory_smart.final_result_table AS sscot 
--  USING (product_code, store_code)
  on li.product_code = sscot.product_code and li.store_code = sscot.store_code
  JOIN article_dc_metrics adm 
--  using (article)
  on alm.article = adm.article 
);
--select * from flag_tagging


CREATE TEMP TABLE  flag_resolve_base ON COMMIT DROP AS (
  SELECT
    *,
    -- old "were conditions configured?" logic, but skip when AST exists
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
  FROM flag_tagging a
);
--select * from flag_resolve_base

CREATE TEMP TABLE flag_resolve ON COMMIT DROP AS (
  SELECT
    *,
    CASE
      WHEN rule_expression IS NOT NULL  THEN
        CASE 
          WHEN inventory_smart.eval_rule_ast(
            rule_expression,
            leaf_cutoff,
            leaf_wosthresh,
            leaf_mindc,
            leaf_minstock
          ) THEN 1 
          ELSE 0 
        END
      ELSE
        CASE
          WHEN no_condition_flag = 0 AND (
            cut_off_wos_flag > 0
            OR min_stock_flag > 0
            OR min_dc_inventory_flag > 0
            OR cutoff_wos_threshold_flag > 0
          ) THEN 1 
          ELSE 0 
        END
    END AS condition_flag
  FROM flag_resolve_base b
);
--select * from flag_resolve

CREATE TEMP TABLE flag_resolve_final ON COMMIT DROP AS (
  SELECT *, condition_flag + no_condition_flag AS final_flag
  FROM flag_resolve c
);
--select * from flag_resolve_final

CREATE TEMP TABLE article_list ON COMMIT DROP AS (
  SELECT
    DISTINCT article
  FROM flag_resolve_final
  WHERE final_flag = 1
    AND article NOT IN (
      SELECT DISTINCT article 
      FROM inventory_smart.alerts_product_level apl 
      WHERE nested_pack_alert_flag=1
    )
);

-- Nested Pack AA
CREATE TEMP TABLE nested_base_article ON COMMIT DROP AS (
  SELECT 
    DISTINCT article 
  FROM inventory_smart.alerts_product_level apl 
  JOIN (
    SELECT
      DISTINCT pack_type_id as article
    FROM inventory_smart.dc_pack_inventory dpi
  ) AS b USING (article)
  WHERE nested_pack_alert_flag=1
  -------If all component product_code of that that pack has product profile then only slelect
  and article in 
  ( 
  select distinct pack_type_id 
  from
	  (
	  	SELECT 
	    pack_type_id,
	    COUNT(DISTINCT product_code) AS total_products,
	    COUNT(DISTINCT product_code_pp) AS matched_products,
	    CASE 
	        WHEN COUNT(DISTINCT product_code) = COUNT(DISTINCT product_code_pp)
	        THEN 'VALID'
	        ELSE 'INVALID'
	    END AS status
	FROM
	(
	    SELECT DISTINCT 
	        dpc.*, 
	        ppm.product_code AS product_code_pp
	    FROM inventory_smart.dc_pack_configuration dpc 
	    LEFT JOIN (
	        SELECT DISTINCT product_code 
	        FROM inventory_smart.product_profile_mapping
	    ) ppm 
	    ON dpc.product_code = ppm.product_code 
	    WHERE pack_type = 'packs'
	) a
	GROUP BY 1
	)b
	where status = 'VALID'
	)
);

CREATE TEMP TABLE article_level_metrics_nested ON COMMIT DROP AS (
  SELECT 
    pack_type_id AS article, 
    store_code, 
    sum(units_in_pack * wos_oh) / sum(units_in_pack) AS article_weighted_fwos 
  FROM inventory_smart.fwos_sku_store_table fsst
  JOIN inventory_smart.dc_pack_configuration dpc USING(product_code)
  JOIN nested_base_article nba ON nba.article=dpc.pack_type_id
  WHERE store_code NOT LIKE 'DC%'
  GROUP BY 1,2
);

CREATE TEMP TABLE article_dc_metrics_nested ON COMMIT DROP AS (
  SELECT
    article,
    SUM(CASE WHEN dc_oh>0 THEN dc_oh ELSE 0 END) AS dc_oh_inv
  FROM (
    SELECT
      pack_type_id AS article, 
      dc_code,
      avg(CASE WHEN oh_pack_qty>0 THEN oh_pack_qty ELSE 0 END) AS dc_oh
    FROM inventory_smart.dc_pack_inventory dpi
    JOIN nested_base_article nba ON nba.article=dpi.pack_type_id
    WHERE pack_type ='packs'
    GROUP BY 1, 2
  ) a
	GROUP BY 1
);

CREATE TEMP TABLE article_avg_target_wos_nested ON COMMIT DROP AS (
  SELECT
    article,
    store_code,
	  ardsp.ar_threshold_wos_threshold * sscot.target_wos as article_weighted_twos
  FROM nested_base_article nba 
  JOIN article_resolved_dc_store_policy ardsp USING (article)
  JOIN (
    SELECT
      DISTINCT paf2.article,
      store_code,
      MAX(wos) AS target_wos
    FROM inventory_smart.final_result_table
    JOIN global.product_attributes_filter paf2 USING (product_code)
    JOIN nested_base_article nba 
    on paf2.article = nba.article
--    USING (article)
    GROUP BY
      1,
      2
  ) AS sscot 
  USING (article)
);

CREATE TEMP TABLE resolved_article_list_nested ON COMMIT DROP AS (
  SELECT 
    DISTINCT a.article
  FROM article_resolved_dc_store_policy a
  JOIN article_level_metrics_nested b USING(article)
  JOIN article_avg_target_wos_nested c USING(article)
);

CREATE TEMP TABLE resolved_product_store_inv_nested ON COMMIT DROP AS (
  SELECT
    nba.article,
    product_code,
    store_code,
    coalesce(sum(oh+oo+it),0) total_inv
  FROM inventory_smart.latest_inventory li
  JOIN inventory_smart.dc_pack_configuration dpc USING(product_code)
  JOIN nested_base_article nba ON nba.article=dpc.pack_type_id 
  WHERE nba.article IN (
    SELECT
      article
    FROM resolved_article_list_nested
  )
  GROUP BY
    nba.article,
    product_code,
    store_code
);

CREATE TEMP TABLE flag_tagging_nested ON COMMIT DROP AS (
  SELECT
    DISTINCT alm.article,
    alm.article_weighted_fwos,
    adm.dc_oh_inv,
    aasot.auto_allocation_rule,
    aasot.auto_allocation_schedular,
    aasot.ar_threshold_wos_condition,
    aasot.ar_threshold_wos_threshold,
    aasot.ar_cut_off_wos,
    aasot.ar_min_dc_inventory,
    aasot.ar_minstock_condition,
    aasot.rule_expression,
    -- aasot.ar_auto_approve_condition,
    aasot.ar_auto_release_condition,
    SUM(
      CASE
        WHEN (li.total_inv) < sscot.min_stock THEN 1
        ELSE 0
      END
    ) OVER (PARTITION BY alm.article) AS minstock_counts,
    CASE
      WHEN aasot.ar_cut_off_wos IS NOT NULL THEN SUM ( 
        CASE
          WHEN alm.article_weighted_fwos <= aasot.ar_cut_off_wos THEN 1
          ELSE 0
        END
      ) OVER (PARTITION BY alm.article)
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
        WHEN adm.dc_oh_inv >= aasot.ar_min_dc_inventory THEN 1
        ELSE 0
      END
      ELSE -1
    END AS min_dc_inventory_flag,
    CASE
      WHEN (aasot.ar_threshold_wos_threshold IS NOT NULL) AND (aasot.ar_threshold_wos_condition = 'lt') THEN SUM( 
        CASE
          WHEN alm.article_weighted_fwos < aatw.article_weighted_twos THEN 1
          ELSE 0 
        END
      ) OVER (PARTITION BY alm.article)
      WHEN (aasot.ar_threshold_wos_threshold IS NOT NULL) AND (aasot.ar_threshold_wos_condition = 'gte') THEN SUM(
        CASE
          WHEN alm.article_weighted_fwos >= aatw.article_weighted_twos THEN 1
          ELSE 0
        END
      ) OVER (PARTITION BY alm.article)
      ELSE -1
    END AS cutoff_wos_threshold_flag
  FROM article_level_metrics_nested AS alm
  JOIN article_resolved_dc_store_policy AS aasot USING (article)
  LEFT JOIN resolved_product_store_inv_nested AS li USING (article,store_code)
  JOIN article_avg_target_wos_nested AS aatw USING (article,store_code)
  JOIN inventory_smart.final_result_table AS sscot 
--  USING (product_code, store_code)
  on li.product_code = sscot.product_code and li.store_code = sscot.store_code
  JOIN article_dc_metrics_nested adm 
--  using(article)
  on alm.article = adm.article 
);
--select * from flag_tagging_nested

CREATE TEMP TABLE  flag_resolve_base_nested ON COMMIT DROP AS (
  SELECT
    *,
    -- old "were conditions configured?" logic, but skip when AST exists
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
  FROM flag_tagging_nested a
);
--select * from flag_resolve_base_nested

CREATE TEMP TABLE flag_resolve_nested ON COMMIT DROP AS (
  SELECT
    *,
    CASE
      WHEN rule_expression IS NOT NULL  THEN
        CASE 
          WHEN inventory_smart.eval_rule_ast(
            rule_expression,
            leaf_cutoff,
            leaf_wosthresh,
            leaf_mindc,
            leaf_minstock
          ) THEN 1 
          ELSE 0 
        END
      ELSE
        CASE
          WHEN no_condition_flag = 0 AND (
            cut_off_wos_flag > 0
            OR min_stock_flag > 0
            OR min_dc_inventory_flag > 0
            OR cutoff_wos_threshold_flag > 0
          ) THEN 1 
          ELSE 0 
        END
    END AS condition_flag
  FROM flag_resolve_base_nested b
);
--select * from flag_resolve_nested

CREATE TEMP TABLE flag_resolve_final_nested ON COMMIT DROP AS (
  SELECT *, condition_flag + no_condition_flag AS final_flag
  FROM flag_resolve_nested c
);
--select * from flag_resolve_final_nested

CREATE TEMP TABLE article_list_nested ON COMMIT DROP AS (
  SELECT
    DISTINCT article
  FROM flag_resolve_final_nested
  WHERE final_flag = 1
);

CREATE TEMP TABLE aa_level ON COMMIT DROP AS (
  SELECT
    DISTINCT paf.l0_name,
    paf.l1_name,
    paf.l2_name,
    paf.l3_name,
    paf.l4_name,
    paf.article,
    -- ar_auto_approve_condition,
    ar_auto_release_condition,
    type,
    alloc_type
  FROM global.product_attributes_filter paf
  JOIN global.product_time_attributes pta USING (product_code)
  JOIN (
    SELECT
      DISTINCT article,
      -- ar_auto_approve_condition,
      ar_auto_release_condition
    FROM article_resolved_dc_store_policy
  ) a USING (article)
  JOIN (
    SELECT
      article,
      2 AS type,
      'dc' AS alloc_type
    FROM article_list
    UNION ALL
    SELECT
      article,
      7 AS type,
      'pdq' AS alloc_type
    FROM article_list_nested
  ) b USING (article)
  WHERE
    attribute_value = 'active'
    AND current_date BETWEEN start_time AND end_time
);

CREATE TEMP TABLE aa_level_style_count ON COMMIT DROP AS (
  SELECT
    DISTINCT a.l0_name AS sales_org_name,
    a.l1_name AS category,
    a.l2_name AS sub_category,
    a.l3_name AS brand,
    a.l4_name AS merchandise_category,
    a.article,
    CAST(FALSE as bool) AS auto_approve_flag,
    ar_auto_release_condition AS auto_release_flag,
    a.type,
    a.alloc_type,
    ROW_NUMBER() OVER (
      PARTITION BY a.l0_name,
      a.l1_name,
      a.l2_name,
      a.l3_name,
      a.l4_name,
      a.type,
      a.alloc_type
    ) AS style_rn
  FROM aa_level AS a
  ORDER BY 1,2,3,4,5,6,7,8,9,10
);

CREATE TEMP TABLE aa_input ON COMMIT DROP AS (
  SELECT
    a.*,
    CASE 
      WHEN alloc_type='pdq' THEN CONCAT( '6_', a.user_code, '_', a.sales_org_name, '_', a.alloc_type, '_', TO_CHAR(NOW() AT TIME ZONE 'Pacific/Auckland', 'YYYYMMDD"T"HH24MISSUS'), a.row_num, a.auto_approve_no)
      ELSE CONCAT( '6_', a.user_code, '_', a.sales_org_name, '_', TO_CHAR(NOW() AT TIME ZONE 'Pacific/Auckland', 'YYYYMMDD"T"HH24MISSUS'), a.row_num, a.auto_approve_no)
    END AS allocation_code,
    CASE 
      WHEN alloc_type='pdq' THEN 2
      ELSE 1 
    end AS batch_number
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        ORDER BY
          a.sales_org_name,
          a.category,
          a.sub_category,
          a.brand,
          a.merchandise_category,
          a.auto_approve_flag,
          a.type,
          a.alloc_type,
          a.int_div,
          a.user_code
      ) AS row_num
    FROM (
      SELECT
        b.sales_org_name,
        b.category,
        b.sub_category,
        b.brand,
        b.merchandise_category,
        b.auto_approve_flag,
        b.auto_release_flag,
        b.type,
        b.alloc_type,
        b.int_div,
        b.user_code,
        CASE
          WHEN auto_approve_flag THEN 1 ELSE 0
        END AS auto_approve_no,
        MAX(style_rn) AS total_style_count,
        COUNT(DISTINCT article) AS style_count_per_row,
        ARRAY_AGG(article) AS article_list
      FROM (
        SELECT
          a.sales_org_name,
          a.category,
          a.sub_category,
          a.brand,
          a.merchandise_category,
          COALESCE(a.auto_approve_flag, FALSE) AS auto_approve_flag,
          COALESCE(a.auto_release_flag, FALSE) AS auto_release_flag,
          a.type,
          a.alloc_type,
          a.article,
          a.style_rn,
          (a.style_rn / 50) AS int_div,
          b.user_code
        FROM aa_level_style_count AS a
        CROSS JOIN global.user_master b
        WHERE
          email IN ('ia_system@impactanalytics.co')           
      ) AS b
      GROUP BY 1, 2, 3, 4, 5, 6, 7, 8,9,10,11
    ) AS a
  ) AS a
);


delete from inventory_smart.auto_allocation_input
where true;

insert into inventory_smart.auto_allocation_input (sales_org_name,category,sub_category,brand,merchandise_category,auto_approve_flag,auto_release,type,alloc_type,int_div,user_code,total_style_count,style_count_per_row,row_num,allocation_code,article_list,auto_approve_no,batch_number)
select sales_org_name,category,sub_category,brand,merchandise_category,auto_approve_flag,auto_release_flag,type,alloc_type,int_div,user_code,total_style_count,style_count_per_row,row_num,allocation_code,article_list,auto_approve_no,batch_number
 from aa_input;

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