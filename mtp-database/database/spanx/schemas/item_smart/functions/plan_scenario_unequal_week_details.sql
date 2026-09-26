--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:plan_scenario_unequal_week_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:plan_scenario_unequal_week_details
--comment: initial changeset for plan_scenario_unequal_week_details
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.plan_scenario_unequal_week_details(p_dept text, where_clause text, where_clause_sc text);
CREATE OR REPLACE FUNCTION item_smart.plan_scenario_unequal_week_details(p_dept text, where_clause text, where_clause_sc text)
 RETURNS TABLE(channel text, sub_channel text, current_week integer, fiscal_week integer, hierarchy_code integer, written_dr_perc double precision, product_code text)
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
            wp.current_week::integer,
            fd.fiscal_week::integer AS fiscal_week,
            wp.hierarchy_code::integer,
            COALESCE(wp.written_dr_perc, 0) AS written_dr_perc,
            mphf.product_code::text
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
            )
        GROUP BY 
            wp.channel, wp.sub_channel, wp.current_week, wp.hierarchy_code, fd.fiscal_week, wp.written_dr_perc, mphf.product_code
        ORDER BY 
            wp.hierarchy_code, 
            wp.current_week;
    ', p_dept, where_clause, where_clause_sc);

    -- Print the query for debugging
    RAISE NOTICE 'Executing query: %', query;

    -- Execute the constructed query
    RETURN QUERY EXECUTE query;
END;
$function$
;