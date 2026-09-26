--liquibase formatted sql
--changeset Rishabh.swarnkar@impactanalytics.co_add_fixinG_cole liquibase:MTP-128531 add new column runOnChange:true stripComments:false splitStatements:false context:MTP-118762_update_cluster_store_count labels:liquibase_project_start
--comment: MTP-128531 add new column
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
	lpcl.placeholder_style,
	lpcl.placeholder_color,
	lpcl.hierarchy_code,
	lpcl.final_level,
	lpcl.channel,
	lpcl.attributes,
    lpcl.sub_channel,
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

    SUM(
    CASE
        WHEN ((lpcl.total_inv_units->>''bop_qty'')::numeric > 0 OR lpcl.flow_cluster_perc > 0)
        THEN lpcl.cluster_store_count
        ELSE 0
    END) as cluster_store_count,
	min(lpcl.image_name_url) as image_name_url,
	min(lpcl.style_id) as style_id,
	min(lpcl.color_id) as color_id,
	min(lpcl.color_name) as color_name,
	min(style_name) as style_name,
	min(lpcl.style_color) as style_color,
	min(merchant_comments) as merchant_comments,
	min(planner_comments) as planner_comments,
	min(lpcl.product_exit_date) as product_exit_date,
	min(lpcl.launch_start_date) as launch_start_date,
	min(lpcl.delivery_count) as delivery_count,
	launch_season,
   avg((sales_units->>''season'')::numeric) AS last_season_sales_units,
   avg((sales->>''season'')::numeric) AS last_season_sales,
   avg((total_inv_units->>''season'')::numeric) AS last_season_total_inv_units,
   avg((receipt_units->>''season'')::numeric) AS last_season_receipt_units,
   avg((receipts->>''season'')::numeric) AS last_season_receipts,
   --avg((gross_margin->>''season'')::numeric) AS last_season_gross_margin,
   --avg((receipts_price_per_unit->>''season'')::numeric) AS receipts_price_per_unit,
   avg((aur->>''season'')::numeric) as last_season_aur,
   avg((air->>''season'')::numeric) as last_season_air,
   avg((aic->>''season'')::numeric) as last_season_aic,
   avg((aps->>''season'')::numeric) as last_season_aps,
   avg((st->>''season'')::numeric)/100.0 as last_season_st_per,
   avg((avg_wk_cnt->>''season'')::numeric) as last_season_regweeks,
   avg((sales_units->>''season'')::numeric) AS sales_units_season,
   avg((sales_units->>''season_reco'')::numeric) AS sales_units_season_reco,
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
	lpcl.relevant_size as relevant_size,
	avg((receipt_units->>''season'')::numeric) as receipt_units_season,
	avg(total_inv_units_lifecycle) as total_inv_units_lifecycle,
	avg(total_inv_units_season) as total_inv_units_season,
	avg((receipt_units->>''season_reco'')::numeric) as receipt_units_season_reco,
	avg(total_inv_units_bop_qty) as total_inv_units_bop_qty,
	avg((receipt_units->>''season'')::numeric) - avg((sales_units->>''season'')::numeric)  as season_eop,
	lpcl.global_choice_id_order,
	lpcl.global_style_id_order


from
	assort_smart.line_plan_choice_launch lpcl
join assort_smart.channel_details cd 
                on
	lpcl.channel = cd.channel_id
     ' || where_clause || '
group by
	plan_code,
	relevant_size,
	lpcl.placeholder_style,
	lpcl.placeholder_color,
	lpcl.global_choice_id_order,
	lpcl.global_style_id_order,
	lpcl.hierarchy_code,
	lpcl.final_level,
	lpcl.attributes,
	lpcl.channel,
    lpcl.sub_channel,
	lpcl.placeholder_style_id,
	lpcl.placeholder_choice_id,
	lpcl.placeholder_choice_id_order,
	lpcl.season_code,
	lpcl.style_tag,
	lpcl.launch,
    lpcl.below_moq_flag,
	lpcl.launch_season

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
