--liquibase formatted sql
--changeset himansh.bhardwaj:sync_auto_allocation_input_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: sync_auto_allocation_input_1
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_auto_allocation_input();
-- DROP PROCEDURE public.sync_auto_allocation_input();

CREATE OR REPLACE PROCEDURE public.sync_auto_allocation_input()
 LANGUAGE plpgsql
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
DROP TABLE IF EXISTS article_avg_target_wos;
DROP TABLE IF EXISTS temp1;
DROP TABLE IF EXISTS temp2;
DROP TABLE IF EXISTS temp3;
DROP TABLE IF EXISTS temp4;
DROP TABLE IF EXISTS temp5;
DROP TABLE IF EXISTS aic_temp;
DROP TABLE IF EXISTS vir_dc;
DROP TABLE IF EXISTS temp6;
DROP TABLE IF EXISTS temp7;
DROP TABLE IF EXISTS article_list;
DROP TABLE IF EXISTS res;
DROP TABLE IF EXISTS aa_input;
DROP TABLE IF EXISTS final_result_table ;

create TABLE auto_allocation_configuration AS (
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
    ar_auto_approve_condition
  FROM
    rcl_dc_store_strategy AS rdss
    JOIN auto_allocation_scheduler_flat_table AS aasft ON rdss.auto_allocation_schedular = aasft.sh_code
    JOIN auto_allocation_rules_flat_table AS aarft ON rdss.auto_allocation_rule = aarft.rule_code
);

raise notice 'auto_allocation_configuration_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE current_cal_info  ON COMMIT drop AS (
  SELECT
    calendar_date,
    fiscal_day_name AS day,
    CASE
      WHEN fiscal_day_in_week NOT IN (1, 7) THEN 'week_days'
      ELSE 'week_days'
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
raise notice 'current_cal_info_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE article_rule_resolution  ON COMMIT drop AS (
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
);
raise notice 'article_rule_resolution_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

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
raise notice 'article_resolved_dc_store_policy_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE article_level_metrics ON COMMIT drop AS (
  SELECT
    article,
    COALESCE(
      CASE
        WHEN SUM(oh) = 0 THEN NULL
        ELSE SUM(wos_oh * oh) / SUM(oh)
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
);
raise notice 'article_level_metrics_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

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
);
raise notice 'article_avg_target_wos_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

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
raise notice 'temp5_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

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
raise notice 'temp4_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE final_result_table ON COMMIT drop AS
select a.article,a.total_inv,b.min_stock
from inventory_smart.final_result_table b
INNER JOIN temp4 a on  a.product_code = b.product_code and a.store_code = b.store_code 
group by a.article,a.total_inv,b.min_stock ;

CREATE INDEX idx_alm_article ON article_level_metrics(article);
CREATE INDEX final_result_table_idx ON final_result_table(article);
--CREATE INDEX idx_sscot_product_store ON inventory_smart.final_result_table(product_code, store_code);
CREATE INDEX idx_aatw_article ON article_avg_target_wos(article);
CREATE INDEX idx_aasot_article ON article_resolved_dc_store_policy(article);

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
    SUM(
      CASE
        WHEN (sscot.total_inv) < sscot.min_stock THEN 1
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
            WHEN sscot.total_inv < sscot.min_stock THEN 1
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
    JOIN article_avg_target_wos AS aatw USING (article)
	--LEFT JOIN temp4 AS li USING (article)
    left join final_result_table AS sscot USING (article)
);

raise notice 'temp1_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE temp2  AS (
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
  FROM
    temp1 a
);
raise notice 'temp2_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE temp3 ON COMMIT drop AS (
  SELECT
    *,
    CASE
      WHEN no_condition_flag = 0
      AND (
        cut_off_wos_flag <> 0
        AND min_stock_flag <> 0
        AND min_dc_inventory_flag <> 0
        AND cutoff_wos_threshold_flag <> 0
      ) THEN 1
      ELSE 0
    END AS condition_flag
  FROM
    temp2 b
);
raise notice 'temp3_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE res ON COMMIT drop AS (
  SELECT
    *,
    condition_flag + no_condition_flag AS final_flag
  FROM
    temp3 c
);
raise notice 'res_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE article_list ON COMMIT drop AS (
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
	select distinct store_code from global.store_groups_mapping)
    )
);
raise notice 'article_list_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE ast_by_article ON COMMIT drop AS(
SELECT  article
       ,MAX(article_status_tag) AS article_status_tag
FROM inventory_smart.article_status_tag ast
LEFT JOIN "global".product_attributes_filter paf USING
(product_code
)
GROUP BY  1);

CREATE INDEX idx_ast_by_article ON ast_by_article(article);

raise notice 'ast_by_article:%',(clock_timestamp()- _st );
_st := clock_timestamp();




CREATE TEMP TABLE aic_temp ON COMMIT drop AS(
SELECT 
    article,
    SUM(vir_reservation_remaining) AS total_vir
FROM 
    inventory_smart.article_inventory_constraint
LEFT JOIN 
    inventory_smart.ph_master pm 
    USING(article)
LEFT JOIN 
    ast_by_article aba 
    USING(article)
WHERE pm.on_floor_date <= current_date+30
GROUP BY 
    article
HAVING 
    SUM(vir_reservation_remaining) > 0
);

raise notice 'aic_temp_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();


CREATE TEMP TABLE vir_dc ON COMMIT drop AS (
WITH product_dc_mapping AS (
  SELECT article, l0_name, dc_code
  FROM "global".product_mapping_product_dc pmpd
  LEFT JOIN "global".product_attributes_filter paf USING(product_code)
  WHERE is_active = true
  GROUP BY 1,2,3
),
aic AS (
  SELECT article, dc_code, vir_reservation_remaining
  FROM inventory_smart.article_inventory_constraint
),
us_ecom_vir AS (
  SELECT
    pdm.article, pdm.l0_name, pdm.dc_code,
    COALESCE(aic.vir_reservation_remaining, 0) AS vir_reservation_remaining,
    SUM(CASE WHEN COALESCE(aic.vir_reservation_remaining,0) > 0 THEN 1 ELSE 0 END) OVER (PARTITION BY pdm.article) AS has_vir_positive
  FROM product_dc_mapping pdm
  LEFT JOIN aic ON pdm.article = aic.article AND pdm.dc_code = aic.dc_code
  WHERE pdm.l0_name = 'US O O ECOM'
),
final_mapping AS (
  SELECT article, l0_name, dc_code
  FROM (
    SELECT article, l0_name, dc_code,
      CASE
        WHEN has_vir_positive > 0 THEN CASE WHEN vir_reservation_remaining > 0 THEN 1 ELSE 0 END
        ELSE 0
      END AS keep_row
    FROM us_ecom_vir
    UNION ALL
    SELECT pdm.article, pdm.l0_name, pdm.dc_code, 1 AS keep_row
    FROM product_dc_mapping pdm
    WHERE pdm.l0_name <> 'US O O ECOM'
  ) x
  WHERE keep_row = 1
),
sku_dc_available_units as (
select article,dc_code,sum(oh) as oh 
from inventory_smart.sku_dc_available_units sdau 
group by 1,2
having sum(oh)>0
),
final_cte as (
select  f.*,name,row_number() over(partition by  article order by name) as rnk from final_mapping f
join sku_dc_available_units using(article,dc_code)
left join global.distribution_centres using(dc_code)
)
select article,dc_code from final_cte
where rnk=1
);
raise notice 'vir_dc_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE temp6 ON COMMIT drop AS (
SELECT
  DISTINCT
  paf.l0_name,
  paf.l1_name,
  paf.l2_name,
  paf.l3_name,
  paf.l4_name,
  paf.l5_name,
  paf.l0_code,
  paf.l1_code,
  paf.l2_code,
  paf.l3_code,
  paf.l4_code,
  paf.l5_code,
  a.ar_auto_approve_condition,
  paf.article,
  MAX(ast.article_status_tag) AS article_status_tag,
  vd.dc_code,
  store_code,
  allocation_type
FROM
  global.product_attributes_filter paf
  JOIN global.product_time_attributes pta USING (product_code)
  JOIN (
    SELECT
      DISTINCT article,
      ar_auto_approve_condition
    FROM
      article_resolved_dc_store_policy
  ) a ON paf.article = a.article
  JOIN (
    SELECT
      DISTINCT article
    FROM
      inventory_smart.dc_pack_inventory dpi
  ) AS b ON paf.article = b.article
  JOIN (select distinct article from aic_temp) aic ON paf.article = aic.article
  LEFT JOIN inventory_smart.article_status_tag ast ON paf.product_code = ast.product_code
  LEFT JOIN vir_dc vd ON paf.article = vd.article
  left join inventory_smart.prepack_eligibility pe  on paf.article =pe.article 
WHERE
  pta.attribute_value = 'active'
  AND current_date BETWEEN pta.start_time AND pta.end_time
  AND paf.article IN (
    SELECT
      article
    FROM
      article_list
  )
GROUP BY
  paf.l0_name,
  paf.l1_name,
  paf.l2_name,
  paf.l3_name,
  paf.l4_name,
  paf.l5_name,
  paf.l0_code,
  paf.l1_code,
  paf.l2_code,
  paf.l3_code,
  paf.l4_code,
  paf.l5_code,
  a.ar_auto_approve_condition,
  paf.article,
  vd.dc_code,
  store_code,
  allocation_type
);

CREATE TEMP TABLE temp7 ON COMMIT drop AS (
  SELECT
    DISTINCT 'dc' AS type,
    a.l0_name,
    a.l1_name,
    a.l2_name,
    a.l3_name,
    a.l4_name,
    a.l5_name,
    a.l0_code,
    a.l1_code,
    a.l2_code,
    a.l3_code,
    a.l4_code,
    a.l5_code,
    ar_auto_approve_condition AS auto_approve_flag,
    article,
    a.article_status_tag,
    a.dc_code,
    store_code,
    allocation_type,
    ROW_NUMBER() OVER (
      PARTITION BY a.l0_name,
      a.l1_name,
      a.l2_name,
      a.l3_name,
      a.l4_name,
      a.l5_name,
      a.l0_code,
  	  a.l1_code,
      a.l2_code,
      a.l3_code,
      a.l4_code,
      a.l5_code,
      article
      ORDER BY
        article
    ) AS style_rn
  FROM
    temp6 AS a
    where dc_code is not  null and store_code is not null
  ORDER BY 
    1,2,3,4,5,6,7,8,9,10,11,12,13
);
raise notice 'temp7_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

CREATE TEMP TABLE aa_input ON COMMIT drop AS (

WITH base_with_row_numbers AS (
    SELECT  type
           ,l0_name
           ,l1_name
           ,l2_name
           ,l3_name
           ,l4_name
           ,l5_name
           ,l0_code
           ,l1_code
           ,l2_code
           ,l3_code
           ,l4_code
           ,l5_code
           ,COALESCE(auto_approve_flag,FALSE) AS auto_approve_flag
           ,article
           ,style_rn
           ,dc_code
           ,user_code
           ,allocation_type
           ,CASE WHEN allocation_type = 'Newly Launched' THEN 'newly_launch'
                 WHEN allocation_type = 'Initial Allocation' THEN 'init_alloc'  
                 ELSE 'normal' END AS group_type
           ,store_code
           ,ROW_NUMBER() OVER (
               PARTITION BY l0_name,l1_name,l3_name,l4_name,l5_name,dc_code,
                           CASE WHEN allocation_type = 'Newly Launched' THEN 'newly_launch' 
                                WHEN allocation_type = 'Initial Allocation' THEN 'init_alloc' 
                                ELSE 'normal' END 
           ) AS article_store_rn 
    FROM temp7 AS a
    CROSS JOIN global.user_master
    WHERE email IN ('dev@impactanalytics.co')
),
article_group_ranking AS (
    SELECT
        l0_name, l1_name, l2_name, l3_name, l4_name, l5_name,
        l0_code, l1_code, l2_code, l3_code, l4_code, l5_code,
        dc_code, auto_approve_flag, user_code, group_type,
        article,
        DENSE_RANK() OVER (
            PARTITION BY
                l0_name, l1_name, l2_name, l3_name, l4_name, l5_name,
                l0_code, l1_code, l2_code, l3_code, l4_code, l5_code,
                dc_code, auto_approve_flag, user_code, group_type
            ORDER BY
                article
        ) AS article_rank
    FROM
        base_with_row_numbers
    GROUP BY
        l0_name, l1_name, l2_name, l3_name, l4_name, l5_name,
        l0_code, l1_code, l2_code, l3_code, l4_code, l5_code,
        dc_code, auto_approve_flag, user_code, group_type, article
),
article_with_int_div AS (
    SELECT
        *,
        FLOOR(
            (article_rank - 1) / 
            CASE 
                WHEN l0_name = 'KOHLS' THEN 10 
                ELSE 30 
            END
        ) AS int_div
    FROM
        article_group_ranking
),
base_with_int_div AS (
    SELECT 
        base.*,
        lookup.int_div
    FROM 
        base_with_row_numbers AS base
    JOIN 
        article_with_int_div AS lookup
      ON base.l0_name = lookup.l0_name
     AND base.l1_name = lookup.l1_name
     AND base.l2_name = lookup.l2_name
     AND base.l3_name = lookup.l3_name
     AND base.l4_name = lookup.l4_name
     AND base.l5_name = lookup.l5_name
     AND base.l0_code = lookup.l0_code
     AND base.l1_code = lookup.l1_code
     AND base.l2_code = lookup.l2_code
     AND base.l3_code = lookup.l3_code
     AND base.l4_code = lookup.l4_code
     AND base.l5_code = lookup.l5_code
     AND base.dc_code = lookup.dc_code
     AND base.auto_approve_flag = lookup.auto_approve_flag
     AND base.user_code = lookup.user_code
     AND base.group_type = lookup.group_type
     AND base.article = lookup.article
)

,
article_stores_agg AS (
SELECT  type
       ,l0_name
       ,l1_name
       ,l2_name
       ,l3_name
       ,l4_name
       ,l5_name
       ,l0_code
       ,l1_code
       ,l3_code
       ,l4_code
       ,l5_code
       ,dc_code
       ,auto_approve_flag
       ,int_div
       ,user_code
           ,group_type
           ,article
           ,ARRAY_AGG(DISTINCT store_code) AS store_codes_array
           ,MAX(style_rn) AS max_style_rn
    FROM base_with_int_div
    GROUP BY type,l0_name,l1_name,l2_name,l3_name,l4_name,l5_name,l0_code,l1_code,l3_code,l4_code,l5_code,dc_code,auto_approve_flag,int_div,user_code,group_type,article
)

	SELECT  type
		   ,l0_name as channel
	       ,l0_name
	       ,l1_name
	       ,l2_name
	       ,l3_name
	       ,l4_name
	       ,l5_name
	       ,l0_code
	       ,l1_code
	       ,l3_code
	       ,l4_code
	       ,l5_code
	       ,dc_code
       ,auto_approve_flag
       ,int_div
	       ,user_code
       ,CASE WHEN auto_approve_flag THEN 1 ELSE 0 END AS auto_approve_no
       ,MAX(max_style_rn) AS total_article_count
       ,COUNT(DISTINCT article) AS article_count_per_row
       ,ARRAY_AGG(DISTINCT article) AS article_list
       ,ROW_NUMBER() OVER (ORDER BY user_code,l0_name,l1_name,l3_name,l4_name,l5_name,int_div) AS row_num
       ,CONCAT('9_',user_code,'_',REPLACE(l0_code,' ',''),'_',REPLACE(LTRIM(l1_code , '0'),' ',''),'_',REPLACE(l3_code,' ',''),'_',REPLACE(l4_code,' ',''),'_',REPLACE(l5_code,' ',''),'_',dc_code,'_',CASE WHEN group_type = 'newly_launch' THEN 'newly_launch_' WHEN group_type = 'init_alloc' THEN 'init_alloc_' ELSE '' END,TO_CHAR(NOW(),'YYYYMMDD"T"HH24MISS'),'_',int_div) AS allocation_code
       ,JSON_OBJECT_AGG(DISTINCT article, ARRAY[dc_code]) AS article_dc_mapping
       ,JSON_OBJECT_AGG(DISTINCT article, store_codes_array) AS mapped_stores
FROM article_stores_agg
GROUP BY  type
         ,l0_name
         ,l1_name
         ,l2_name
         ,l3_name
         ,l4_name
         ,l5_name
         ,l0_code
         ,l1_code
         ,l3_code
         ,l4_code
         ,l5_code
         ,auto_approve_flag
         ,int_div
         ,user_code
         ,group_type
         ,dc_code
ORDER BY  user_code
         ,l0_name
         ,l1_name
         ,l2_name
         ,l3_name
         ,l4_name
         ,l5_name
         ,dc_code
         ,int_div
);
raise notice 'aa_input_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

delete from inventory_smart.auto_allocation_input where true;
raise notice 'delete_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();
--WITH kohls_flag AS (
--  SELECT
--    COUNT(*) FILTER (WHERE l0_name = 'KOHLS') > 0 AS kohls_exists
--  FROM aa_input
--)
INSERT INTO inventory_smart.auto_allocation_input (
    type,
    channel,
    l0_name,
    l1_name,
    l2_name,
    auto_approve_flag,
    int_div,
    user_code,
    auto_approve_no,
    total_article_count,
    article_count_per_row,
    article_list,
    row_num,
    allocation_code,
    article_dc_mapping,
    mapped_stores,
    updated_at
--    batch_number
)
SELECT 
    aa.type,
    aa.channel,
    aa.l0_name,
    aa.l1_name,
    aa.l2_name,
    aa.auto_approve_flag,
    aa.int_div,
    aa.user_code,
    aa.auto_approve_no,
    aa.total_article_count,
    aa.article_count_per_row,
    aa.article_list,
    aa.row_num,
    aa.allocation_code,
    aa.article_dc_mapping,
    aa.mapped_stores,
    CURRENT_TIMESTAMP
--    CASE
--      WHEN NOT k.kohls_exists THEN 1
--      WHEN aa.l0_name = 'KOHLS' THEN 1
--      ELSE 2
--    END
FROM aa_input aa;
--CROSS JOIN kohls_flag k;

raise notice 'insert_time:%',(clock_timestamp()- _st );
_st := clock_timestamp();

  
  
  
  	call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;