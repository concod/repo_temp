--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co_MTP-74810 liquibase:New_SP_for_Line_Architecture runOnChange:true stripComments:false splitStatements:false context:MTP-74810_Creating_new_Line_Arch_SP labels:liquibase_project_start
--comment: Creating_new_Line_Arch_SP_of_MTP-74810
--rollback: SELECT 1


DROP FUNCTION IF EXISTS assort_smart.line_architecture_cluster_launch_level_count(jsonb, text);

CREATE OR REPLACE FUNCTION assort_smart.line_architecture_cluster_launch_level_count(input_json jsonb, where_clause text)
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
        SELECT COUNT(*) AS total_records
        FROM (
            SELECT placeholder_choice_id,
                   channel,
                   placeholder_style_id,
                   launch,
                   cluster_code
            FROM (
                SELECT
                    placeholder_choice_id,
                    hierarchy_code,
                    channel,
                    placeholder_style_id,
                    image_name_url,
                    style_id,
                    color_id,
                    launch,
                    launch_start_date,
                    all_store_flag,
                    cluster_code,
                    fiscal_month
                FROM assort_smart.line_arch_store_week
                ' || where_clause || '
                GROUP BY
                    placeholder_choice_id, hierarchy_code, channel, placeholder_style_id,
                    image_name_url, style_id, color_id, launch, launch_start_date,
                    all_store_flag, cluster_code, fiscal_month
            ) a
            GROUP BY placeholder_choice_id, channel, placeholder_style_id,
                     launch, cluster_code
        ) result
        ' || _query_table_filters || ';
    ';

   -- Execute the dynamic query and store the result
    execute _query_combine
    into result;

    -- Return the result
    return result;
end;
$function$
; 