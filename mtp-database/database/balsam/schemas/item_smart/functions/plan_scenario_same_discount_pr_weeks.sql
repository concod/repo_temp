--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:plan_scenario_same_discount_pr_weeks_fiscal runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:plan_scenario_same_discount_pr_weeks_fiscal
--comment: version of plan_scenario_same_discount_pr_weeks driven by fiscal year(s) instead of explicit week range
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.plan_scenario_same_discount_pr_weeks(
  p_channels text[],
  p_sub_channels text[],
  p_start_week integer,
  p_end_week integer,
  p_hierarchy_codes character varying[],
  p_dept text,
  p_brand text
);

CREATE OR REPLACE FUNCTION item_smart.plan_scenario_same_discount_pr_weeks(
  p_channels text[],
  p_sub_channels text[],
  p_start_week integer,
  p_end_week integer,
  p_hierarchy_codes character varying[],
  p_dept text,
  p_brand text
)
RETURNS TABLE(
  written_dr_perc double precision,
  fiscal_year integer,
  fiscal_month_name text,
  fiscal_month_num integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
  query text;
BEGIN
  /*
    This version is driven by a fiscal week range (p_start_week, p_end_week).
    It:
      - Builds a fiscal-week calendar for the requested weeks from global.fiscal_date_mapping
      - Aggregates written_dr_perc from wp_master_%I at the (year, quarter, month, week) grain
      - Rolls up to one row per (fiscal_year, fiscal_month_name, fiscal_month_num)
      - Applies the same "single distinct DR => value, else -1.0" rule at the month level
      - Ensures every fiscal month covered by the requested week range is present in the output
      - Exposes fiscal_month_in_year as fiscal_month_num
  */

  query := format('
    WITH calendar_weeks AS (
      SELECT DISTINCT
        fd.fiscal_year_week::int AS current_week,
        fd.fiscal_year::int       AS fiscal_year,
        fd.fiscal_quarter_name::text AS fiscal_quarter_name,
        fd.fiscal_month_name::text   AS fiscal_month_name,
        fd.fiscal_month_in_year::int AS fiscal_month_num,
        fd.fiscal_week::int          AS fiscal_week
      FROM "global".fiscal_date_mapping fd
      WHERE fd.fiscal_year_week BETWEEN %s AND %s
    ),
    week_data AS (
      SELECT
        wp.channel,
        wp.sub_channel,
        fd.fiscal_year_week::int     AS current_week,
        COALESCE(wp.written_dr_perc, 0) AS written_dr_perc,
        fd.fiscal_year::int          AS fiscal_year,
        fd.fiscal_quarter_name::text AS fiscal_quarter_name,
        fd.fiscal_month_name::text   AS fiscal_month_name,
        fd.fiscal_month_in_year::int AS fiscal_month_num,
        fd.fiscal_week::int          AS fiscal_week
      FROM item_smart.wp_master_%I wp
      JOIN "global".fiscal_date_mapping fd
        ON wp.current_week = fd.fiscal_year_week
      WHERE
        fd.fiscal_year_week BETWEEN %s AND %s
        AND wp.channel = ANY (%L)
        AND wp.sub_channel = ANY (%L)
        AND wp.hierarchy_code IN (
          SELECT hierarchy_code
          FROM item_smart.mv_product_hierarchies_filter mphf
          WHERE mphf.item = ANY(%L)
            AND mphf.l0_name = %L
          UNION ALL
          SELECT hierarchy_code
          FROM item_smart.placeholders_info phi
          WHERE phi.item = ANY(%L)
            AND phi.l0_name = %L
        )
    ),
    grouped_data AS (
      SELECT
        current_week,
        fiscal_year,
        fiscal_quarter_name,
        fiscal_month_name,
        fiscal_month_num,
        fiscal_week,
        COUNT(DISTINCT written_dr_perc)    AS dr_perc_count,
        MAX(written_dr_perc)               AS max_written_dr_perc
      FROM week_data
      GROUP BY
        current_week,
        fiscal_year,
        fiscal_quarter_name,
        fiscal_month_name,
        fiscal_month_num,
        fiscal_week
    ),
    week_level AS (
      SELECT
        fiscal_year,
        fiscal_month_name,
        fiscal_month_num,
        CASE
          WHEN dr_perc_count = 1 THEN max_written_dr_perc
          ELSE -1.0
        END AS week_written_dr
      FROM grouped_data
    ),
    month_calendar AS (
      SELECT DISTINCT
        fiscal_year,
        fiscal_month_name,
        fiscal_month_num
      FROM calendar_weeks
    ),
    month_agg AS (
      SELECT
        fiscal_year,
        fiscal_month_name,
        fiscal_month_num,
        COUNT(*) FILTER (WHERE week_written_dr <> -1.0)                      AS weeks_with_valid_dr,
        COUNT(DISTINCT week_written_dr) FILTER (WHERE week_written_dr <> -1.0) AS distinct_valid_dr,
        MAX(week_written_dr) FILTER (WHERE week_written_dr <> -1.0)            AS max_valid_dr
      FROM week_level
      GROUP BY
        fiscal_year,
        fiscal_month_name,
        fiscal_month_num
    )
    SELECT
      CASE
        WHEN ma.weeks_with_valid_dr IS NULL THEN 0.0             -- no data for this month
        WHEN ma.weeks_with_valid_dr = 0 THEN -1.0                -- all weeks resolved to -1
        WHEN ma.distinct_valid_dr = 1 THEN ma.max_valid_dr       -- consistent non -1 value across weeks
        ELSE -1.0                                                -- conflicting non -1 values across weeks
      END AS written_dr_perc,
      mc.fiscal_year,
      mc.fiscal_month_name,
      mc.fiscal_month_num
    FROM month_calendar mc
    LEFT JOIN month_agg ma
      ON mc.fiscal_year = ma.fiscal_year
     AND mc.fiscal_month_name = ma.fiscal_month_name
     AND mc.fiscal_month_num = ma.fiscal_month_num
    GROUP BY
      mc.fiscal_year,
      mc.fiscal_month_name,
      mc.fiscal_month_num,
      ma.weeks_with_valid_dr,
      ma.distinct_valid_dr,
      ma.max_valid_dr
    ORDER BY
      mc.fiscal_year,
      mc.fiscal_month_num;
  ',
  p_start_week,
  p_end_week,
  p_dept,
  p_start_week,
  p_end_week,
  p_channels,
  p_sub_channels,
  p_hierarchy_codes,
  p_brand,
  p_hierarchy_codes,
  p_brand);

  -- Print the query for debugging
  RAISE NOTICE 'Executing query: %', query;

  -- Execute the constructed query
  RETURN QUERY EXECUTE query;
END;
$function$
;