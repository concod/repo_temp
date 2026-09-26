--liquibase formatted sql
--changeset chitrakumari.singh@impactanalytics.co liquibase:add_new_column_in_copy  runOnChange:true stripComments:false splitStatements:false context:add_new_column_in_copy labels:liquibase_project_start
--comment: Add new plans for copy
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_plan_master(existing_plan_code integer, plan_name text, plan_type text);

CREATE OR REPLACE FUNCTION assort_smart.copy_plan_master(existing_plan_code integer, plan_name text, plan_type text)
 RETURNS TABLE(plan_code integer, record_type text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _plan_code integer;
    _record_type text;
    _DB_query_combine text := '';
BEGIN
    _DB_query_combine := 
        'INSERT INTO "assort_smart".plan_master (
            name, description, selling_period_sdate, selling_period_edate, status, 
            compare_year, special_classification, is_deleted, created_at, updated_at, 
            created_by, updated_by, hierarchy_level, hierarchy_code, record_type, 
            channel_id, sub_channel_id, year, season_name, season_code, levels, 
            parent_hierarchy_combination, quarter, status_id, plan_sub_step, steps, step_id, sub_step_id
        ) 
        SELECT ''' || plan_name || ''', description, selling_period_sdate, selling_period_edate, 
               status, compare_year, special_classification, is_deleted, created_at, updated_at, 
               created_by, updated_by, hierarchy_level, hierarchy_code, ''' || plan_type || ''', channel_id, 
               sub_channel_id, year, season_name, season_code, levels, parent_hierarchy_combination, 
               quarter, status_id, plan_sub_step, steps, step_id, sub_step_id
        FROM assort_smart.plan_master 
        WHERE plan_code = ' || existing_plan_code || ' 
        RETURNING plan_code, record_type;';
    
    -- Execute the query and retrieve the new plan_code and record_type
    EXECUTE _DB_query_combine INTO _plan_code, _record_type;
    
    -- Return the results
    RETURN QUERY  select _plan_code, _record_type;
END;
$function$
;

