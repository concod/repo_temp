--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:plan_scenario_same_discount_pr_weeks runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:plan_scenario_same_discount_pr_weeks
--comment: initial changeset for plan_scenario_same_discount_pr_weeks
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.plan_scenario_same_discount_pr_weeks(p_channels text[], p_sub_channels text[], p_start_week integer, p_end_week integer, p_hierarchy_codes character varying[], p_dept text);
CREATE OR REPLACE FUNCTION item_smart.plan_scenario_same_discount_pr_weeks(p_channels text[], p_sub_channels text[], p_start_week integer, p_end_week integer, p_hierarchy_codes character varying[], p_dept text)
 RETURNS TABLE(current_week integer, written_dr_perc double precision, fiscal_year integer, fiscal_quarter_name text, fiscal_month_name text, fiscal_week integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  query text;
BEGIN
  -- Construct the query as a string using format
  query := format('
    WITH week_data AS (
      SELECT
		wp.channel,
      	wp.sub_channel,
        wp.current_week::int,
        coalesce (wp.written_dr_perc,0) as written_dr_perc,
        fd.fiscal_year::int,
        fd.fiscal_quarter_name::text,
        fd.fiscal_month_name::text,
        fd.fiscal_week::int
      FROM item_smart.wp_master_%I wp
      JOIN 
          (select distinct fiscal_year,fiscal_quarter_name,fiscal_month_name ,fiscal_week, fiscal_year_week
        	from "global".fiscal_date_mapping) fd
      ON wp.current_week = fd.fiscal_year_week
      WHERE
        wp.current_week BETWEEN %s AND %s
        AND wp.channel = ANY (%L)
		AND wp.sub_channel = ANY (%L)
        AND wp.hierarchy_code IN (
          SELECT hierarchy_code 
          FROM item_smart.mv_product_hierarchies_filter mphf 
          WHERE mphf.product_code = ANY(%L)
          UNION ALL
          SELECT hierarchy_code 
          FROM item_smart.placeholders_info phi
          WHERE phi.product_code = ANY(%L)
        )
    ),
    grouped_data AS (
      SELECT
        current_week,
        COUNT(DISTINCT written_dr_perc) AS dr_perc_count
      FROM week_data
      GROUP BY current_week
    )
    SELECT
      wd.current_week,
      CASE 
        WHEN gd.dr_perc_count = 1 THEN MAX(wd.written_dr_perc)
        ELSE -1.0
      END AS written_dr_perc,
      wd.fiscal_year,
      wd.fiscal_quarter_name,
      wd.fiscal_month_name,
      wd.fiscal_week
    FROM week_data wd
    JOIN grouped_data gd ON wd.current_week = gd.current_week
    GROUP BY wd.current_week, gd.dr_perc_count, wd.fiscal_year, wd.fiscal_quarter_name, wd.fiscal_month_name, wd.fiscal_week
    ORDER BY wd.current_week;
  ', p_dept, p_start_week, p_end_week, p_channels, p_sub_channels,p_hierarchy_codes, p_hierarchy_codes);

  -- Print the query for debugging
  RAISE NOTICE 'Executing query: %', query;

  -- Execute the constructed query
  RETURN QUERY EXECUTE query;
END;
$function$
;