--liquibase formatted sql
--changeset bhaskar.reddy@impactanalytics.co:sync_auto_allocation_input_v6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_sp
--comment: initial changeset for sync_auto_allocation_input_v6
--rollback: SELECT 1

DROP PROCEDURE if EXISTS public.sync_auto_allocation_input();

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
drop table if exists aa_input;
drop table if exists aa_input_asn;
drop table if exists temp7_asn;
drop table if exists temp6_asn;
drop table if exists asn_articles;

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
	      threshold_wos_data.dropdown AS ar_threshold_wos_condition,
	      threshold_wos_data.threshold AS ar_threshold_wos_threshold,
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
	    FROM inventory_smart.dc_store_policy_user_rule x,
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
	    ar_threshold_wos_condition,
	    ar_threshold_wos_threshold,
	    ar_cut_off_wos,
	    ar_min_dc_inventory,
	    ar_minstock_condition,
	    ar_auto_approve_condition
	  FROM rcl_dc_store_strategy AS rdss
	  JOIN auto_allocation_scheduler_flat_table AS aasft ON rdss.auto_allocation_schedular = aasft.sh_code
	  JOIN auto_allocation_rules_flat_table AS aarft ON rdss.auto_allocation_rule = aarft.rule_code
	);

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

	create temp TABLE article_rule_resolution 
	on commit DROP 
	AS (
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
	        FROM inventory_smart.dc_pack_inventory dpi
	      ) dpi USING(article)
	      WHERE
	        paf.active = TRUE
	        AND current_date BETWEEN pta.start_time
	        AND pta.end_time
	    )',
	    10003,
	    current_date
	  )
	  JOIN global.product_attributes_filter paf USING (product_code)
	);

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
	    ar_threshold_wos_condition,
	    ar_threshold_wos_threshold,
	    ar_cut_off_wos,
	    ar_min_dc_inventory,
	    ar_minstock_condition,
	    ar_auto_approve_condition,
	    article,
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
	  JOIN article_rule_resolution arr USING (auto_allocation_rule, auto_allocation_schedular)
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
	    article,
	    COALESCE(
	      CASE
	        WHEN SUM(tot_inv) = 0 THEN NULL
	        ELSE SUM(fwos * tot_inv) / SUM(tot_inv) -- used fwos instead of wos_oh
	      END,
	      0
	    ) AS article_weighted_fwos,
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
	);

	 CREATE TEMP TABLE article_avg_target_wos 
	 ON COMMIT drop 
	 AS (
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
	      product_code,
	      MAX(wos) AS target_wos
	    FROM inventory_smart.final_result_table
	    JOIN global.product_attributes_filter paf2 USING (product_code)
	    JOIN (
	      SELECT
	        DISTINCT article
	      FROM inventory_smart.dc_pack_inventory dpi2
	    ) dpi2 USING (article)
	    GROUP BY
	      1,
	      2
	  ) AS sscot USING (article)
	  LEFT JOIN (
	    SELECT
	      product_code,
	      SUM(oh + oo + it) AS total_inv
	    FROM inventory_smart.latest_inventory li
	    JOIN global.product_attributes_filter paf USING (product_code)
	    GROUP BY
	      1
	  ) AS li USING (product_code)
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
	    article_avg_target_wos c
	  WHERE
	    A.article = b.article
	    AND b.article = c.article
	);

CREATE TEMP table temp4 
ON COMMIT drop 
AS (
	  select
			article,
			product_code,
			store_code,
			coalesce(sum(oh + it + oo),0) total_inv
		from inventory_smart.latest_inventory li
	join global.product_attributes_filter paf1
        using (product_code)
	  where article IN (
	    SELECT
	      article
	    FROM temp5
	  )
	  GROUP BY
	    article,
	    product_code,
	    store_code
	);

	create temp TABLE temp1 
	ON COMMIT drop 
	AS (
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
	      WHEN (aasot.ar_threshold_wos_threshold IS NOT NULL) AND (aasot.ar_threshold_wos_condition = 'lt') THEN CASE
	        WHEN alm.article_weighted_fwos < aatw.article_weighted_twos THEN 1
	        ELSE 0
	      END
	      WHEN (aasot.ar_threshold_wos_threshold IS NOT NULL) AND (aasot.ar_threshold_wos_condition = 'gte') THEN CASE
	        WHEN alm.article_weighted_fwos >= aatw.article_weighted_twos THEN 1
	        ELSE 0
	      END
	      ELSE -1
	    END AS cutoff_wos_threshold_flag
	  FROM article_level_metrics AS alm
	  JOIN article_resolved_dc_store_policy AS aasot USING (article)
	  LEFT JOIN temp4 AS li USING (article)
	  JOIN article_avg_target_wos AS aatw USING (article)
	  JOIN inventory_smart.final_result_table AS sscot USING (product_code, store_code)
	);

	create temp table  temp2 
ON COMMIT drop 
AS (
	  SELECT
	    *,
	    CASE
	      WHEN GREATEST(
	        cut_off_wos_flag,
	        min_stock_flag,
	        min_dc_inventory_flag,
	        cutoff_wos_threshold_flag
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
	        cut_off_wos_flag <> 0
	        AND min_stock_flag <> 0
	        AND min_dc_inventory_flag <> 0
	        AND cutoff_wos_threshold_flag <> 0
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
	    paf.l1_name,
	    paf.l2_name,
	    paf.l3_id_name, -- updated l3_name to l3_id_name
	    paf.l4_name,
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
	    DISTINCT a.l0_name AS division,
	    a.l1_name AS department,
	    a.l2_name AS sub_department,
	    a.l3_id_name AS "class",
	    a.l4_name AS style,
	    a.article,
	    ar_auto_approve_condition AS auto_approve_flag,
	    ROW_NUMBER() OVER (
	      PARTITION BY a.l0_name,
	      a.l1_name,
	      a.l2_name,
	      a.l3_id_name,
	      a.l4_name
	    ) AS style_rn
	  FROM temp6 AS a
	  ORDER BY
	    1,
	    2,
	    3,
	    4,
	    5,
	    6,
	    7,
	    8
	);

-- ASN flow: collect ASN articles for ECOMM only
create temp table asn_articles 
on commit drop 
as (
  select distinct asn_id, article
  from inventory_smart.asn_to_allocate_alert
  where handling_type = 'ECOMM'
);

-- Map ASN articles to product hierarchy and auto-approve flag
create temp table temp6_asn 
on commit drop 
as (
  select distinct
    paf.l0_name,
    paf.l1_name,
    paf.l2_name,
    paf.l3_id_name,
    paf.l4_name,
    paf.article,
    aa.asn_id,
    ar_auto_approve_condition
  from global.product_attributes_filter paf
  join global.product_time_attributes pta using(product_code)
  join asn_articles aa using(article)
  left join article_resolved_dc_store_policy ar using(article)
  where attribute_value = 'active'
    and current_date between pta.start_time and pta.end_time
);

-- Build per-style rows for ASN with style index and approval flag
create temp table temp7_asn 
on commit drop 
as (
  select distinct 
    a.l0_name as division,
    a.l1_name as department,
    a.l2_name as sub_department,
    a.l3_id_name as "class",
    a.l4_name as style,
    a.article,
    a.asn_id,
    coalesce(ar_auto_approve_condition, false) as auto_approve_flag,
    row_number() over (
      partition by a.l0_name, a.l1_name, a.l2_name, a.l3_id_name, a.l4_name, a.asn_id
    ) as style_rn
  from temp6_asn as a
  order by 
    1,2,3,4,5,6
);

-- Aggregate ASN rows into input shape similar to aa_input
create temp table aa_input_asn 
on commit drop  
as (
  select
    a.*,
    concat('6_', a.user_code, '_', a.division, '_', to_char(now(), 'YYYYMMDD"T"HH24MISSUS'), a.row_num, '3') as allocation_code
  from
    (
      select
        *,
        row_number() over (
          order by
            a.division,
            a.department,
            a.sub_department,
            a."class",
            a.auto_approve_flag,
            a.int_div,
            a.user_code
        ) as row_num
      from
        (
          select
            b.asn_id,
            b.division,
            b.department,
            b.sub_department,
            b."class",
            b.auto_approve_flag,
            b.int_div,
            b.user_code,
            case
              when auto_approve_flag then 1 else 0
            end as auto_approve_no,
            max(style_rn) as total_style_count,
            count(distinct article) as style_count_per_row,
            array_agg(article) as article_list,
			JSON_OBJECT_AGG(article, ARRAY[mapped_store]) AS mapped_stores,
		    JSON_OBJECT_AGG(article, ARRAY[store_group]) AS store_groups
          from
            (
              select
                a.asn_id,
                a.division,
                a.department,
                a.sub_department,
                a."class",
                a.style,
                coalesce(a.auto_approve_flag, false) as auto_approve_flag,
                a.article,
                a.style_rn,
                (a.style_rn / 50) as int_div,
                b.user_code,
				c.sg_code as store_group,
			    '4905' as mapped_store
              from
                temp7_asn as a
                cross join global.user_master b
				CROSS JOIN (select * from global.store_groups where name = 'Default') c
              where
                email in ('ia_system@impactanalytics.co')           
            ) as b
          group by
            1, 2, 3, 4, 5, 6, 7, 8, 9
        ) as a
    ) as a
);

create temp table aa_input 
  ON COMMIT drop  
  AS (
  SELECT
    a.*,
    CONCAT( '6_', a.user_code, '_', a.division, '_', TO_CHAR(NOW(), 'YYYYMMDD"T"HH24MISSUS'), a.row_num, '2') AS allocation_code
FROM
  (
    SELECT
      *,
      ROW_NUMBER() OVER (
        ORDER BY
          a.division,
          a.department,
          a.sub_department,
          a."class",
        --   a.style,
          a.auto_approve_flag,
          a.int_div,
          a.user_code
      ) AS row_num
    FROM
      (
        SELECT
          b.division,
          b.department,
          b.sub_department,
          b."class",
        --   b.style,
          b.auto_approve_flag,
          b.int_div,
          b.user_code,
          CASE
            WHEN auto_approve_flag THEN 1 ELSE 0
          END AS auto_approve_no,
          MAX(style_rn) AS total_style_count,
          COUNT(DISTINCT article) AS style_count_per_row,
          ARRAY_AGG(article) AS article_list,
		  '{}'::json AS mapped_stores,
		  '{}'::json AS store_groups
        FROM
          (
            SELECT
              a.division,
              a.department,
              a.sub_department,
              a."class",
              a.style,
              COALESCE(a.auto_approve_flag, FALSE) AS auto_approve_flag,
              a.article,
              a.style_rn,
              (a.style_rn / 50) AS int_div,
              b.user_code,
			  c.sg_code as store_group,
			  'NA' as mapped_store
            FROM
              temp7 AS a
              CROSS JOIN global.user_master b
			  CROSS JOIN (select * from global.store_groups where sg_code = 5) c
            WHERE
              email IN ('ia_system@impactanalytics.co')           
          ) AS b
        GROUP BY
          1, 2, 3, 4, 5, 6, 7, 8
      ) AS a
  ) AS a
);

--select * from aa_input;

delete from inventory_smart.auto_allocation_input
where true;

insert into inventory_smart.auto_allocation_input (
  division,
  department,
  sub_department,
  "class",
  auto_approve_flag,
  int_div,
  user_code,
  total_style_count,
  style_count_per_row,
  row_num,
  allocation_code,
  article_list,
  auto_approve_no,
  asn_id,
  allocation_type,
  auto_release,
  mapped_stores,
  store_groups
)
select 
  division,
  department,
  sub_department,
  "class",
  auto_approve_flag,
  int_div,
  user_code,
  total_style_count,
  style_count_per_row,
  row_num,
  allocation_code,
  article_list,
  auto_approve_no,
  null as asn_id,
  'DC' as allocation_type,
  false as auto_release,
  mapped_stores,
  store_groups
from aa_input
union all
select 
  division,
  department,
  sub_department,
  "class",
  auto_approve_flag,
  int_div,
  user_code,
  total_style_count,
  style_count_per_row,
  row_num,
  allocation_code,
  article_list,
  auto_approve_no,
  asn_id,
  'ASN' as allocation_type,
  true as auto_release,
  mapped_stores,
  store_groups 
  from aa_input_asn;

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