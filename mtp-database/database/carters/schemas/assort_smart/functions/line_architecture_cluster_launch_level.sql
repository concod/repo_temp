--liquibase formatted sql
--changeset vishal.hosamani@impactanalytics.co add_cluster_display_name liquibase:search_fix runOnChange:true stripComments:false splitStatements:false context:MTP-99891_search_fix labels:liquibase_project_start
--comment: add cluster_display_name in query
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.line_architecture_cluster_launch_level(jsonb, text);


CREATE OR REPLACE FUNCTION assort_smart.line_architecture_cluster_launch_level(input_json jsonb, where_clause text)
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
WITH monthly_summary AS (
    SELECT
        placeholder_choice_id,
        fiscal_month,
        SUM(sales_units) AS sales_units,
        SUM(receipt_units) AS receipt_units,
        SUM(sales) AS sales,
        SUM(receipts) AS receipts
    FROM assort_smart.line_arch_store_week
    ' || where_clause || '
    GROUP BY placeholder_choice_id, fiscal_month
),

cluster_level_data AS (
    SELECT
        placeholder_choice_id,
        channel,
        hierarchy_code,
        placeholder_style_id,
        style_color,
        MAX(image_name_url) AS image_url,
        MAX(style_id) AS style_id,
        COUNT(DISTINCT store_code) AS store_code,
        MAX(color_id) AS color_id,
        MAX(launch) AS launch,
        MAX(launch_start_date) AS launch_start_date,
        MAX(CAST(all_store_flag AS INTEGER)) AS all_store_flag,
        cluster_code,
        cluster_display_name,
        SUM(receipt_units) AS total_receipt_units,
        SUM(sales_units) AS total_sales_units,
        SUM(sales) AS total_sales,
        SUM(receipts) AS total_receipts
    FROM assort_smart.line_arch_store_week
    ' || where_clause || '
    GROUP BY placeholder_choice_id, channel, hierarchy_code, placeholder_style_id, launch, cluster_code,cluster_display_name,style_color
),

final_result AS (
    SELECT
        c.*,
        m.monthly_aggregate
    FROM cluster_level_data c
    JOIN (
        SELECT
            placeholder_choice_id,
            JSONB_OBJECT_AGG(
                fiscal_month,
                JSONB_BUILD_OBJECT(
                    ''sales_units'', sales_units,
                    ''receipt_units'', receipt_units,
                    ''sales'', sales,
                    ''receipts'', receipts
                ) ORDER BY fiscal_month
            ) AS monthly_aggregate
        FROM monthly_summary
        GROUP BY placeholder_choice_id
    ) m ON c.placeholder_choice_id = m.placeholder_choice_id
)

select json_agg(result) as result from (select * from (SELECT * FROM final_result
ORDER BY placeholder_choice_id, channel, placeholder_style_id, launch, cluster_code) as sub_result ' || _query_table_filters || ') as result
    ';

    -- Debugging statements
--    raise notice 'Input JSON: %', input_json;
--    raise notice 'Query Table Filters: %', _query_table_filters;
--    raise notice 'Query Combine: %', _query_combine;

    -- Execute the dynamic query and store the result
    execute _query_combine
    into result;

    -- Return the result
    return result;
end;
$function$
;
