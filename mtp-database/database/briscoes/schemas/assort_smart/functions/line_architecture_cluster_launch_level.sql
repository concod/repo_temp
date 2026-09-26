--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co MTP-130205 liquibase:query store_count_logic_change runOnChange:true stripComments:false splitStatements:false context:MTP-130205_store_count_logic_change labels:liquibase_project_start
--comment:store count logic change in line_architecture_cluster_launch_level
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.line_architecture_cluster_launch_level(jsonb, text);

CREATE OR REPLACE FUNCTION assort_smart.line_architecture_cluster_launch_level(input_json jsonb, where_clause text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_table_filters text := '';
    _query_combine text;
    result json;
BEGIN
    -- Generate table filters using the input JSON
    _query_table_filters := global.form_table_query(input_json);

    -- Construct the dynamic query
    _query_combine := '
WITH b AS (
  SELECT *
  FROM assort_smart.line_arch_store_week
  ' || where_clause || '
),

monthly_summary AS (
    SELECT
        placeholder_choice_id,
        fiscal_month,
        SUM(sales_units) AS sales_units,
        SUM(receipt_units) as receipt_units,
        SUM(sales) AS sales,
        SUM(receipts) AS receipts
    FROM b
    GROUP BY placeholder_choice_id, fiscal_month
),

filtered_store_counts as (
    select placeholder_choice_id, count(distinct store_code) as filtered_store_count
    from (
        select placeholder_choice_id, store_code
        from b
        group by placeholder_choice_id, store_code
        having sum(receipt_units) > 0
    ) a
    group by placeholder_choice_id
),

cluster_level_data AS (
    SELECT
        final_level,
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
        SUM(receipt_units)/COUNT(DISTINCT store_code) as total_receipt_units,
        SUM(sales_units)/COUNT(DISTINCT store_code) AS total_sales_units,
        SUM(sales) AS total_sales,
        SUM(receipts) AS total_receipts
    FROM b
    LEFT JOIN filtered_store_counts fsc 
    using(placeholder_choice_id)
    GROUP BY final_level, placeholder_choice_id, channel, hierarchy_code, placeholder_style_id, launch, cluster_code, cluster_display_name, style_color, style_name, color_name
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

SELECT json_agg(result) AS result 
FROM (
    SELECT *
    FROM (
        SELECT *
        FROM final_result
        ORDER BY placeholder_choice_id, channel, placeholder_style_id, launch, cluster_code
    ) AS sub_result ' || _query_table_filters || '
) AS result
    ';

    -- Debugging
    RAISE NOTICE 'Query Combine: %', _query_combine;

    -- Execute the dynamic query and store the result
    EXECUTE _query_combine INTO result;

    -- Return the result
    RETURN result;
END;
$function$;
