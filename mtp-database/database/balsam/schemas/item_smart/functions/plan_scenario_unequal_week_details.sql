--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:plan_scenario_unequal_week_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:plan_scenario_same_discount_pr_weeks_fiscal
--comment: version of plan_scenario_unequal_week_details driven by fiscal year(s) instead of explicit week range
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.plan_scenario_unequal_week_details(p_dept text, where_clause text, where_clause_sc text);
CREATE OR REPLACE FUNCTION item_smart.plan_scenario_unequal_week_details(p_dept text, where_clause text, where_clause_sc text)
 RETURNS TABLE(
    channel text, 
    sub_channel text, 
    fiscal_week integer,
    written_dr_perc double precision, 
    product_code text,
    current_month text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    query TEXT;
BEGIN
    -- Construct the query as a string using format
    query := format('
        SELECT 
            wp.channel,
            wp.sub_channel,
            wp.current_week::integer as fiscal_week,
            COALESCE(wp.written_dr_perc, 0) AS written_dr_perc,
            mphf.item::text as product_code,
            fd.fiscal_month_name_abb::text as current_month
        FROM 
            item_smart.wp_master_%I wp
        JOIN 
            "global".fiscal_date_mapping fd
            ON wp.current_week = fd.fiscal_year_week
        JOIN 
            item_smart.mv_product_hierarchies_filter mphf
            ON wp.hierarchy_code = mphf.hierarchy_code
        %s
            AND wp.hierarchy_code IN (
                SELECT hierarchy_code 
                FROM item_smart.mv_product_hierarchies_filter 
                %s
                union all
                select hierarchy_code from item_smart.placeholders_info %s
                union all
                select hierarchy_code from item_smart.new_skus %s
            )
        GROUP BY 
            wp.channel, wp.current_week,wp.sub_channel, wp.written_dr_perc, mphf.item,fd.fiscal_month_name_abb,
            fd.fiscal_month_in_year
        ORDER by
       		wp.channel,
            fd.fiscal_month_name_abb,
            fd.fiscal_month_in_year;
    ', p_dept, where_clause, where_clause_sc,where_clause_sc,where_clause_sc);

    -- Print the query for debugging
    RAISE NOTICE 'Executing query: %', query;

    -- Execute the constructed query
    RETURN QUERY EXECUTE query;
END;
$function$
;