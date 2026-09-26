--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_build_step3_overall_metrics_temp_table_query_7 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_build_step3_overall_metrics_temp_table_query_7
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_build_step3_overall_metrics_temp_table_query;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_build_step3_overall_metrics_temp_table_query()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
   
BEGIN
    
    return 'create temp table overall_metrics_cte on commit drop as 
                select
                    1 as order_,
                    true as is_footer_row,
                    ''Sub total'' as rowId,
                    null::int as product_level_id,
                    ''Sub total'' as product_level_value,
                    null::int as store_level_id,
                    null::text as store_level_value,
                    null::float as cw_offer_percentage,
                    0 as is_row_locked,
                    null::text[] as brand,
                    null::text[] as division,
                    null::text[] as department,
					null::text[] as style,
                    null::text[] as color,
                    null::text[] as size,
					null::text[] as product_name,
					null::float8 as age,
                    null::float8 as base_price,
                    jsonb_build_object(
                        ''pcd_'' || od.pcd_id ::text || ''_finalized_discount_percent'',
                        bl_recommended_offer_percentage,
                        ''pcd_'' || od.pcd_id ::text || ''_finalized_pp'',
                        round(bl_effective_price_point :: numeric, 2),
                        ''pcd_'' || od.pcd_id::text || ''_incremental_discount'',
                        price_markdown.fn_get_incremental_discount(
                            bl_recommended_offer_percentage,
                            coalesce(bl_previous_markdown_percentage,0)
                        ),
                        ''pcd_'' || od.pcd_id ::text || ''_ia_reco_discount_percent'',
                        ia_recommended_offer_percentage,
                        ''pcd_'' || od.pcd_id::text || ''_ia_incremental_discount'',
                        price_markdown.fn_get_incremental_discount(
                            ia_recommended_offer_percentage,
                            coalesce(ia_previous_markdown_percentage,0)
                        ),
                        ''pcd_'' || od.pcd_id ::text || ''_ia_reco_pp'',
                        round(ia_effective_price_point :: numeric, 2),
                        ''pcd_'' || od.pcd_id ::text || ''_margin_finalized'',
                        round(bl_margin :: decimal, 2),
                        ''pcd_'' || od.pcd_id ::text || ''_revenue_finalized'',
                        round(bl_revenue :: decimal, 2),
                        ''pcd_'' || od.pcd_id ::text || ''_unit_finalized'',
                        round(bl_sales_units :: decimal, 2),
                        ''pcd_'' || od.pcd_id ::text || ''_unit_ia_reco'',
                        round(ia_sales_units :: decimal, 2),
                        ''pcd_'' || od.pcd_id ::text || ''_margin_ia_reco'',
                        round(ia_margin :: decimal, 2),
                        ''pcd_'' || od.pcd_id ::text || ''_revenue_ia_reco'',
                        round(ia_revenue :: decimal, 2),
                        ''pcd_'' || od.pcd_id ::text || ''_finalized_rem_inv'',
                        round(bl_inventory :: decimal,
                        2),
                        ''pcd_'' || od.pcd_id ::text || ''_ia_rem_inv'',
                        round(ia_inventory :: decimal,
                        2),
                        ''pcd_'' || od.pcd_id ::text || ''_finalized_markdown_dollar'',
                        round(bl_markdown_dollar :: decimal,
                        2),
                        ''pcd_'' || od.pcd_id ::text || ''_ia_markdown_dollar'',
                        round(ia_markdown_dollar :: decimal,
                        2)
                        ) as pcd_metrics
                from (
                    select bl.pcd_id,
                        bl_recommended_offer_percentage,
                        bl_previous_markdown_percentage,
                        ia_recommended_offer_percentage,
                        ia_previous_markdown_percentage,
                        bl_effective_price_point,
                        ia_effective_price_point,
                        ia_sales_units,
                        ia_margin,
                        ia_revenue,
                        bl_sales_units,
                        bl_margin,
                        bl_revenue,
                        bl_inventory,
                        bl_markdown_dollar,
                        ia_inventory,
                        ia_markdown_dollar
                    from (
                        select
                            bl.pcd_id,
                            avg(bl_recommended_offer_percentage) as bl_recommended_offer_percentage,
                            avg(bl_previous_markdown_percentage) as bl_previous_markdown_percentage,
                            avg(bl_effective_price_point) as bl_effective_price_point,
                            sum(bl_sales_units) as bl_sales_units,
                            sum(bl_margin) as bl_margin,
                            sum(bl_revenue) as bl_revenue,
                            sum(bl_inventory) as bl_inventory,
		                    sum(bl_markdown_dollar) as bl_markdown_dollar
                        from
                            bl_override_final_cte bl
                        group by
                            bl.pcd_id
                    ) bl
                    full outer join
                    (
                        select
                            ia.pcd_id,
                            avg(ia_recommended_offer_percentage) as ia_recommended_offer_percentage,
                            avg(ia_previous_markdown_percentage) as ia_previous_markdown_percentage,
                            avg(ia_effective_price_point) as ia_effective_price_point,
                            sum(ia_sales_units) as ia_sales_units,
                            sum(ia_margin) as ia_margin,
                            sum(ia_revenue) as ia_revenue,
                            sum(ia_inventory) as ia_inventory,
		                    sum(ia_markdown_dollar) as ia_markdown_dollar
                        from
                            ia_recc_cte ia
                        group by
                            ia.pcd_id
                    ) ia
                    on bl.pcd_id = ia.pcd_id
                ) od;
		';
end;
$function$
;
