--liquibase formatted sql
--changeset liquibase:line_plan_choice_launch_delivery runOnChange:true stripComments:false splitStatements:false context:line_plan_choice_launch labels:liquibase_project_start
--comment: line_plan_choice_launch_delivery
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.line_plan_choice_launch_delivery(input_json jsonb, where_clause text);
CREATE OR REPLACE FUNCTION assort_smart.line_plan_choice_launch_delivery(input_json jsonb, where_clause text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
declare
    _query_table_filters text := '';
    _query_combine text;
    result json;
begin
    -- Generate table filters using the input JSON
    _query_table_filters := global.form_table_query(input_json);

    -- Construct the dynamic query
    _query_combine := '
        select json_agg(result) as result
        from (
            SELECT
                plan_choice_launch_delivery_id,
                plan_code,
                hierarchy_code,
                final_level,
                channel,
                sub_channel,
                gender,
                season_code,
                placeholder_choice_id,
                placeholder_style_id,
                style_id,
                color_id,
                style_name,
                color_name,
                clearance_date,
                CAST(launch AS INT) AS launch, -- Cast launch as integer
                launch_start_date,
                delivery_start_date,
                delivery,
                launch_delivery_perc,
                receipt_units,
                receipts,
                created_at,
                updated_at
            from assort_smart.line_plan_choice_launch_delivery
            ' || where_clause || ' ' || _query_table_filters || '
        ) result
    ';

    -- Debugging statements
    raise notice 'Input JSON: %', input_json;
    raise notice 'Query Table Filters: %', _query_table_filters;
    raise notice 'Query Combine: %', _query_combine;

    -- Execute the dynamic query and store the result
    execute _query_combine
    into result;

    -- Return the result
    return result;
end;
$function$

;