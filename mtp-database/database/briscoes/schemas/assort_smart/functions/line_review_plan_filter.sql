--liquibase formatted sql
--changeset paras.jain@impactanalytics.co:fixing_plan_code runOnChange:true stripComments:false splitStatements:false context:add_compare_year labels:liquibase_project_start
--comment: Add compare year in response
DROP FUNCTION IF EXISTS assort_smart.line_review_plan_filter(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION assort_smart.line_review_plan_filter(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm TEXT := '';
    _query_table_filters TEXT := '';
    _query_combine TEXT;
    _where TEXT;
    _sub_channel TEXT;
BEGIN
    -- Prepare WHERE clause dynamically from JSON filters
    _where := (SELECT assort_smart.prepare_where_clause_from_json_filters($2));
    _sub_channel := COALESCE((SELECT assort_smart.prepare_where_clause_from_json_filters($4)), '');

    -- Form the plan_master query with dynamic WHERE clause
    _query_pm := 'SELECT * FROM assort_smart.line_review_plan_master ' || _where;
    RAISE NOTICE '_query_pm = %', _query_pm;

    -- Form the table query based on additional filters
    _query_table_filters := global.form_table_query($3);  -- Removed double quotes
    RAISE NOTICE '_query_table_filters = %', _query_table_filters;

    -- Combine queries to fetch the required data
    _query_combine := '
        SELECT
            main.line_review_plan_master_id as plan_code,
            pmlrm.plan_code as strategy_plan_code,
            TRIM(main.name) AS name,
            main.description,
            main.selling_period_sdate,
            main.selling_period_edate,
            INITCAP(REPLACE(REPLACE(main.plan_sub_step, ''_'', '' ''), ''-'', '' '')) as status,
            main.channel_id,
            main.channel_code,
            main.sub_channel_code,
            main.sub_channel_id,
            main.created_at,
            main.updated_at,
            main.created_by AS created_by_code,
            main.status_id,
            main.hierarchy_code,
            main.record_type,
            main.compare_year,
            main.season_name,
            main.levels,
            main.steps as step_display_name,
			main.plan_sub_step as sub_step_display_name,
            main.parent_hierarchy_combination,
            main.season_code,
            main.year,
            um.name AS created_by
        FROM (
            SELECT main.*, channel_details.channel_code, channel_details.sub_channel_code
            FROM (' || _query_pm || ') main
             JOIN (
                SELECT cd.*, scd.sub_channel_code
                FROM assort_smart.channel_details cd
                LEFT JOIN assort_smart.sub_channel_details scd
                ON cd.channel_id = scd.channel_id
                ' || _sub_channel|| '
            ) channel_details
            ON main.channel_id = channel_details.channel_id
        ) main
        JOIN global.user_master um
        ON main.created_by = um.user_code
        JOIN assort_smart.plan_master_line_review_mapper pmlrm
        on main.line_review_plan_master_id = pmlrm.line_review_plan_master_id
        ';

    -- Debugging: Log the final combined query
    RAISE NOTICE 'Final Query: %', 'SELECT * FROM (' || _query_combine || ') X ' || _query_table_filters;

    -- Open cursor and execute the dynamically constructed query
    OPEN input FOR EXECUTE 'SELECT * FROM (' || _query_combine || ') X ' || _query_table_filters;

    RETURN input;
END;
$function$;
