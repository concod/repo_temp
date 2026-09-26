--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_build_step3_final_table_data_temp_query_8 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_build_step3_final_table_data_temp_query_8
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_build_step3_final_table_data_temp_query;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_build_step3_final_table_data_temp_query(record_filter_where_clause text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
   
BEGIN
	if record_filter_where_clause is null or record_filter_where_clause = '' then 
		record_filter_where_clause = '';
	else
		record_filter_where_clause = ' and ' || record_filter_where_clause;
	end if;
	--record_filter_where_clause = '';
    return 	'	create temp table table_data_cte on commit drop as 
		            select
		                0 as order_,
		                false as is_footer_row,
		                bl.product_level_value || ''_'' || bl.store_level_value as rowId,
		                bl.product_level_id::int,
		                bl.product_level_value::text,
		                bl.store_level_id::int,
		                bl.store_level_value::text,
		                cw.cw_offer_percentage as cw_offer_percentage,
		                bl.is_locked as is_row_locked,
		                bl.brand,
		                bl.division,
		                bl.department,
						bl.style,
		                bl.color,
		                bl.size,
						bl.product_name,
						bl.age,
		                bl.base_price,
		                jsonb_build_object(
		                    ''pcd_'' || bl.pcd_id::text || ''_finalized_is_locked'',
		                    false,
		                    ''pcd_'' || bl.pcd_id::text || ''_finalized_discount_percent'',
		                    bl_recommended_offer_percentage,
		                    ''pcd_'' || bl.pcd_id::text || ''_incremental_discount'',
		                    price_markdown.fn_get_incremental_discount(
		                        bl_recommended_offer_percentage,
		                        coalesce(bl_previous_markdown_percentage,0)
		                    ),
		                    ''pcd_'' || bl.pcd_id::text || ''_approval_status'',
		                    bl.approval_status,
		                    ''pcd_'' || bl.pcd_id::text || ''_finalized_pp'',
		                    round(bl_effective_price_point :: numeric, 2),
		                    ''pcd_'' || bl.pcd_id::text || ''_margin_finalized'',
		                    bl_margin,
		                    ''pcd_'' || bl.pcd_id::text || ''_revenue_finalized'',
		                    bl_revenue,
		                    ''pcd_'' || bl.pcd_id::text || ''_unit_finalized'',
		                    bl_sales_units,
		                    ''pcd_'' || bl.pcd_id::text || ''_ia_reco_discount_percent'',
		                    ia_recommended_offer_percentage,
		                    ''pcd_'' || bl.pcd_id::text || ''_ia_incremental_discount'',
		                    price_markdown.fn_get_incremental_discount(
		                        ia_recommended_offer_percentage,
		                        ia_previous_markdown_percentage
		                    ),
		                    ''pcd_'' || bl.pcd_id::text || ''_ia_reco_pp'',
		                    round(ia_effective_price_point :: numeric, 2),
		                    ''pcd_'' || bl.pcd_id::text || ''_unit_ia_reco'',
		                    ia_sales_units,
		                    ''pcd_'' || bl.pcd_id::text || ''_margin_ia_reco'',
		                    ia_margin,
		                    ''pcd_'' || bl.pcd_id::text || ''_revenue_ia_reco'',
		                    ia_revenue,
		                    ''pcd_'' || bl.pcd_id::text || ''_is_locked'',
		                    bl.is_locked,
		                    ''pcd_'' || bl.pcd_id ::text || ''_finalized_rem_inv'',
		                    round(bl_inventory :: decimal,
		                    2),
		                    ''pcd_'' || bl.pcd_id ::text || ''_ia_rem_inv'',
		                    round(ia_inventory :: decimal,
		                    2),
		                    ''pcd_'' || bl.pcd_id ::text || ''_finalized_markdown_dollar'',
		                    round(bl_markdown_dollar :: decimal,
		                    2),
		                    ''pcd_'' || bl.pcd_id ::text || ''_ia_markdown_dollar'',
		                    round(ia_markdown_dollar :: decimal,
		                    2),
		                    ''pcd_'' || bl.pcd_id::text || ''_enable_lock'',
		                    case
		                        when bl.bl_recommended_offer_percentage is null then false
		                        else true
		                    end
		            ) as pcd_metrics
		            from
		                bl_override_final_cte bl
		                inner join
		                ia_recc_cte ia
		                on
		                bl.product_level_id = ia.product_level_id
		                and bl.store_level_id = ia.store_level_id
		                and bl.pcd_id = ia.pcd_id
		                left join 
		                current_week_metric_cte cw
		                on cw.product_level_id = bl.product_level_id and bl.store_level_id = cw.store_level_id
		            where true 
		                '|| record_filter_where_clause ||';';
end;
$function$
;
