--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:plan_scenario_discount_pr_weeks runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:plan_scenario_discount_pr_weeks
--comment: initial changeset for plan_scenario_discount_pr_weeks
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.plan_scenario_discount_pr_weeks(p_channel text[], p_sub_channel text[], hierarchy_codes text[], start_week integer, end_week integer, dept text, plan text);
CREATE OR REPLACE FUNCTION item_smart.plan_scenario_discount_pr_weeks(p_channel text[], p_sub_channel text[], hierarchy_codes text[], start_week integer, end_week integer, dept text, plan text)
 RETURNS TABLE(current_week integer, written_dr_perc double precision, fiscal_year integer, fiscal_quarter_name text, fiscal_month_name text, fiscal_week integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    specified_codes_count int;
    dynamic_query text;
BEGIN
    specified_codes_count := array_length(hierarchy_codes, 1);

    -- Construct the dynamic query
    dynamic_query := format('
        WITH master_data AS (
            SELECT
                mt.current_week::int,
                CASE 
                    WHEN SUM(coalesce(mt.written_sales_units,0)) = 0 THEN AVG(mt.written_dr_perc) 
                    ELSE 1 - (
                        (SUM(coalesce(mt.written_sales_units,0) * coalesce(mt.written_aur,0)) / SUM(coalesce(mt.written_sales_units,0))) /
                        (SUM(coalesce(mt.written_sales_units,0) * coalesce(mt.written_air,0)) / SUM(coalesce(mt.written_sales_units,0)))
                    ) END as written_dr_perc,
                fd.fiscal_year::int,
                fd.fiscal_quarter_name_abb::text AS fiscal_quarter_name,
                fd.fiscal_month_name_abb::text AS fiscal_month_name,
                fd.fiscal_week::int,
                fd.fiscal_year_week::int
            FROM 
                item_smart.%I_master_%I mt
            JOIN 
                (select distinct fiscal_year,fiscal_quarter_name_abb,fiscal_month_name_abb ,  fiscal_week, fiscal_year_week
        			from "global".fiscal_date_mapping) fd
            ON mt.current_week = fd.fiscal_year_week
            WHERE 
                mt.channel = ANY(%L)
				AND mt.sub_channel = ANY(%L)
                AND mt.current_week BETWEEN %L AND %L
                AND mt.hierarchy_code IN (
                    SELECT hierarchy_code 
                    FROM item_smart.mv_product_hierarchies_filter mphf 
                    WHERE mphf.product_code = ANY(%L)
                    UNION ALL 
                    SELECT hierarchy_code 
                    FROM item_smart.placeholders_info phi
                    WHERE phi.product_code = ANY(%L)
                )
            GROUP BY 
                mt.current_week, 
                fd.fiscal_year, fd.fiscal_quarter_name_abb, fd.fiscal_month_name_abb, 
                fd.fiscal_week, fd.fiscal_year_week
        ),
        aggregated_data AS (
            SELECT
                current_week,
                SUM(written_dr_perc)::float8 AS written_dr_perc,
                MIN(fiscal_year) AS fiscal_year,
                MIN(fiscal_quarter_name) AS fiscal_quarter_name,
                MIN(fiscal_month_name) AS fiscal_month_name,
                MIN(fiscal_week) AS fiscal_week,
                MIN(fiscal_year_week) AS fiscal_year_week
            FROM
                master_data
            GROUP BY
                current_week
        )
        SELECT
            current_week,
            written_dr_perc,
            fiscal_year,
            fiscal_quarter_name,
            fiscal_month_name,
            fiscal_week
        FROM
            aggregated_data
        ORDER BY
            current_week', plan, dept, p_channel,p_sub_channel, start_week, end_week, hierarchy_codes, hierarchy_codes, specified_codes_count);

    -- Print the query with substituted parameters
    RAISE NOTICE 'Executing query: %', dynamic_query;

    -- Execute the query
    RETURN QUERY EXECUTE dynamic_query
    USING p_channel, start_week, end_week, hierarchy_codes;
END;
$function$
;