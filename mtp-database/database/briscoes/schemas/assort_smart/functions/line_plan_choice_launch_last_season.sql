--liquibase formatted sql
--changeset mehul.jain@impactanalytics.co MTP-135704_adding_searchable_columns liquibase:MTP-135704-adding-searchable-columns runOnChange:true stripComments:false splitStatements:false context:MTP-99891_sub_query_alias_fix_3_1 labels:liquibase_project_start
--comment: MTP-135704_adding_searchable_columns
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.line_plan_choice_launch_last_season(jsonb, text);

CREATE OR REPLACE FUNCTION assort_smart.line_plan_choice_launch_last_season(input_json jsonb, where_clause text)
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
        from (select * from (
select
	lpcl.plan_code,
	lpcl.hierarchy_code,
	lpcl.final_level,
	lpcl.channel,
    lpcl.sub_channel,
    lpcl.attributes,
	lpcl.placeholder_style_id,
	lpcl.placeholder_choice_id,
	lpcl.placeholder_choice_id_order,
	lpcl.season_code,
    lpcl.style_tag,
    lpcl.below_moq_flag,
	array_agg(lpcl.cluster_code) as cluster_code,
	array_agg(lpcl.cluster_display_name) as cluster_display_name,
    SUM(
    CASE 
        WHEN ((lpcl.total_inv_units->>''bop_qty'')::numeric > 0 OR lpcl.flow_cluster_perc > 0) 
        THEN lpcl.cluster_store_count 
        ELSE 0 
    END) as last_season_store_count,
	min(lpcl.image_name_url) as image_name_url,
	min(lpcl.style_id) as style_id,
	min(lpcl.color_id) as color_id,
	min(lpcl.color_name) as color_name,
	min(style_name) as style_name,
	min(lpcl.launch_start_date) as launch_start_date,
	min(lpcl.delivery_count) as delivery_count,
	launch_season,
   avg((sales_units->>''season'')::numeric) AS last_season_sales_units,
   avg((sales->>''season'')::numeric) AS last_season_sales,
   avg((total_inv_units->>''season'')::numeric) AS last_season_total_inv_units,
   avg((receipt_units->>''season'')::numeric) AS last_season_receipt_units,
   avg((receipts->>''season'')::numeric) AS last_season_receipts,
   avg((gross_margin->>''season'')::numeric) AS last_season_gross_margin,

    avg((receipt_units->>''season_reco'')::numeric) AS receipt_units_season_reco,
    avg((sales_units->>''season'')::numeric) as sales_units_season,
    avg((sales_units->>''season_reco'')::numeric)  as sales_units_season_reco,
    avg((receipt_units->>''season'')::numeric) as receipt_units_season,

   --avg((receipts_price_per_unit->>''season'')::numeric) AS receipts_price_per_unit,
   avg((aur->>''season'')::numeric) as last_season_aur,
   avg((air->>''season'')::numeric) as last_season_air,
   avg((aic->>''season'')::numeric) as last_season_aic,
   avg((aps->>''season'')::numeric) as last_season_aps,
   avg((st->>''season'')::numeric)/100.0 as last_season_st_per,
   avg((avg_wk_cnt->>''season'')::numeric) as last_season_regweeks,

   avg((aps->>''season'')::numeric) as aps_season,
   avg((aur->>''season'')::numeric) as aur_season,
   avg((air->>''season'')::numeric) as air_season,
   avg((aic->>''season'')::numeric) as aic_season,
   avg((st->>''season'')::numeric) as st_season,
   avg((avg_wk_cnt->>''season'')::numeric) as avg_wk_cnt_season,
   avg((avg_wk_cnt->>''season_reco'')::numeric) as avg_wk_cnt_season_reco,
   avg((aps->>''season_reco'')::numeric) as aps_season_reco,
   avg((aur->>''season_reco'')::numeric) as aur_season_reco,
   avg((air->>''season_reco'')::numeric) as air_season_reco,
   avg((aic->>''season_reco'')::numeric) as aic_season_reco,
   avg((sales->>''season'')::numeric) AS sales_season,
   avg((sales->>''season_reco'')::numeric) AS sales_season_reco,
    avg((receipts->>''season'')::numeric) AS receipts_season,
	avg((receipts->>''season_reco'')::numeric) AS receipts_season_reco,
	avg((st->>''season_reco'')::numeric) as st_season_reco,
	avg((gross_margin->>''season'')::numeric) AS gross_margin_season,
	avg((gross_margin->>''season_reco'')::numeric) AS gross_margin_season_reco,
    SUM(lpcl.cluster_store_count) as cluster_store_count,
    MIN(lpcl.thread_count) as thread_count,
    MIN(lpcl.relevant_size) as relevant_size,
    MIN(lpcl.product_exit_date) as product_exit_date,
    MIN(lpcl.vendor_name) as vendor_name,
    MIN(lpcl.sustainability) as sustainability,
    MIN(lpcl.vendor_product_id) as vendor_product_id,
    MIN(lpcl.commitment_type) as commitment_type,
    MIN(lpcl.choice_status) as choice_status,
    MIN(lpcl.material) as material,
    MIN(lpcl.pattern) as pattern,
    MIN(lpcl.fit) as fit,
    MIN(lpcl.width) as width,
    MIN(lpcl.license) as license,
    MIN(lpcl.down_ratio) as down_ratio,
    MIN(lpcl.product_description) as product_description,
    MIN(lpcl.range) as range,
    MIN(lpcl.color_family) as color_family,
    MIN(lpcl.country_of_origin) as country_of_origin,
    MIN(lpcl.value_stream) as value_stream,
    MIN(lpcl.season) as season,
    MIN(lpcl.season_year) as season_year,
    MIN(lpcl.price_architecture) as price_architecture,
    MIN(lpcl.merchant_comments) as merchant_comments,
    MIN(lpcl.planner_comments) as planner_comments

from
	assort_smart.line_plan_choice_launch lpcl
join assort_smart.channel_details cd 
                on
	lpcl.channel = cd.channel_id
     ' || where_clause || '
group by
	plan_code,
	lpcl.attributes,
	lpcl.hierarchy_code,
	lpcl.final_level,
	lpcl.channel,
    lpcl.sub_channel,
	lpcl.placeholder_style_id,
	lpcl.placeholder_choice_id,
	lpcl.placeholder_choice_id_order,
	lpcl.season_code,
	lpcl.style_tag,
	lpcl.launch,
    lpcl.below_moq_flag,
	lpcl.launch_season,
    lpcl.thread_count,
    lpcl.relevant_size,
    lpcl.product_exit_date,
    lpcl.vendor_name,
    lpcl.sustainability,
    lpcl.vendor_product_id,
    lpcl.commitment_type,
    lpcl.choice_status,
    lpcl.material,
    lpcl.pattern,
    lpcl.fit,
    lpcl.width,
    lpcl.license,
    lpcl.down_ratio,
    lpcl.product_description,
    lpcl.range,
    lpcl.color_family,
    lpcl.country_of_origin,
    lpcl.value_stream,
    lpcl.season,
    lpcl.season_year,
    lpcl.price_architecture,
    lpcl.merchant_comments,
    lpcl.planner_comments

        ) as sub_result ' || _query_table_filters || ') as result
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
