--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co MTP-96012 liquibase:SP_change runOnChange:true stripComments:false splitStatements:false context:MTP-96012_SP_change labels:liquibase_project_start
--comment: SP_Chnage_MTP-96012
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
    -- Step 1: Monthly data aggregated at placeholder_choice_id level
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
        SUM(receipt_units) AS receipt_units,
        SUM(sales) AS sales,
        SUM(receipts) AS receipts
    FROM b
    GROUP BY placeholder_choice_id, fiscal_month
),

-- Step 2: Per-cluster data (the same as your original logic minus the monthly_aggregate)
cluster_level_data AS (
    SELECT
        placeholder_choice_id,
        channel,
        hierarchy_code,
        placeholder_style_id,
        MAX(image_name_url) AS image_url,
        MAX(style_id) AS style_id,
        COUNT(DISTINCT store_code) AS store_code,
        MAX(color_id) AS color_id,
        MAX(launch) AS launch,
        MAX(launch_start_date) AS launch_start_date,
        MAX(CAST(all_store_flag AS INTEGER)) AS all_store_flag,
        cluster_code,
        SUM(receipt_units) AS total_receipt_units,
        SUM(sales_units) AS total_sales_units,
        SUM(sales) AS total_sales,
        SUM(receipts) AS total_receipts
    FROM b
    GROUP BY placeholder_choice_id, channel, hierarchy_code, placeholder_style_id, launch, cluster_code
),

-- Step 3: Join cluster-level data with monthly summary at choice level
final_result AS (
    SELECT
        c.*
    FROM cluster_level_data c
    JOIN (
        SELECT
            placeholder_choice_id
        FROM monthly_summary
        GROUP BY placeholder_choice_id
    ) m ON c.placeholder_choice_id = m.placeholder_choice_id
)

select count(*) as result from (SELECT * FROM final_result
ORDER BY placeholder_choice_id, channel, placeholder_style_id, launch, cluster_code ' || _query_table_filters || ') as result
    ';

   -- Execute the dynamic query and store the result
    execute _query_combine
    into result;

    -- Return the result
    return result;
end;
$function$
;