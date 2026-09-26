--liquibase formatted sql
--changeset liquibase:handle-add-delivery-order runOnChange:true stripComments:false splitStatements:false context:handle-add-delivery-order labels:liquibase_project_start
--comment: handle-add-delivery-order
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.line_plan_choice_launch_delivery(jsonb, text);

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
                lpcld.plan_choice_launch_delivery_id,
                lpcld.plan_code,
                lpcld.hierarchy_code,
                lpcld.final_level,
                lpcld.channel,
                lpcld.sub_channel,
                lpcld.gender,
                lpcld.season_code,
                sm.name as season,
                lpcld.placeholder_choice_id,
                lpcld.placeholder_style_id,
                lpcld.style_id,
                lpcld.color_id,
                lpcld.style_color,
                lpcld.style_name,
                lpcld.color_name,
                lpcld.clearance_date,
                CAST(lpcld.launch AS INT) AS launch, -- Cast launch as integer
                lpcld.launch_start_date,
                lpcld.delivery_start_date,
                lpcld.delivery,
                lpcld.launch_delivery_perc,
                lpcld.receipt_units,
                lpcld.receipts,
                lpcld.created_at,
                lpcld.updated_at,
                lpcld.nrf_color_bucket
            from assort_smart.line_plan_choice_launch_delivery lpcld
            inner join "global".season_master sm
            on sm.season_code = lpcld.season_code::INT
            ' || where_clause || '
            ORDER BY lpcld.delivery, lpcld.created_at ASC
        ) result ' || _query_table_filters || '
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
