--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_build_step3_bl_override_temp_table_query_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_build_step3_bl_override_temp_table_query_9
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_build_step3_bl_override_temp_table_query;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_build_step3_bl_override_temp_table_query(_strategy_id integer, _product_level integer, _store_level integer, _pcd_ids integer[] DEFAULT NULL::integer[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    bl_override_pg_select text = '';
    bl_override_sg_select text = '';
    bl_override_pg_join text = '';
    bl_override_sg_join text = '';
    bl_override_pcd_where text = '';
    bl_override_pg_group_by text = '';
    bl_override_sg_group_by text = '';
    bl_override_temp_table_query text;
BEGIN
	
    -- constructing product and store level selection and grouping
	select product_select, product_group_by, store_select, store_group_by
    into bl_override_pg_select, bl_override_pg_group_by, bl_override_sg_select, bl_override_sg_group_by
    from price_markdown.fn_v3_get_step3_level_selection_and_grouping(_product_level, _store_level);

    -- adding pcd id condition if available
    if _pcd_ids is not null then 
        bl_override_pcd_where := format('where sdc.pcd_id in (%1$s)', array_to_string(_pcd_ids, ','));
    end if;

    -- adding the joins for product and store level filters
    if _product_level = -100 then 
        bl_override_pg_join := format('inner join (
                                        select pg_id, pg_name 
                                        from pricesmart.tb_product_group 
                                        where pg_id in (
                                            select product_group_id 
                                            from price_markdown.tb_strategy_product_groups 
                                            where strategy_id = %1$s
                                        )
                                    ) pg on pg.pg_id = sdc.product_group_id', _strategy_id::text);
	end if;

    if _store_level = -100 then 
        bl_override_sg_join := format('inner join (
                                        select sg_id, sg_name 
                                        from pricesmart.tb_store_group 
                                        where sg_id in (
                                            select store_group_id 
                                            from price_markdown.tb_strategy_store_groups 
                                            where strategy_id = %1$s
                                        )
                                    ) sg on sg.sg_id = sdc.store_group_id', _strategy_id::text);
    else
        bl_override_sg_join := 'inner join price_markdown.tb_store_master sm on sm.store_id = sdc.store_id';
    end if;

    -- final query construction for temporary table
    bl_override_temp_table_query := format('
		create temp table bl_override_final_cte on commit drop as
        select 
			s.*,
            0 as is_locked,
			coalesce(
                CASE WHEN end_rule is NULL THEN round(cast(bl_selling_price as numeric), 2)
                    ELSE ROUND(cast(bl_selling_price -(end_rule/100) as numeric))+(end_rule/100)
                end,
               ROUND(cast(((100-bl_recommended_offer_percentage)*average_retail_price/100) -(end_rule/100) as numeric))+(end_rule/100)
            )
            as bl_effective_price_point
        from (
            select
                sdc.strategy_id,
                %2$s
                %3$s
                sdc.pcd_id,
                round(avg(tsd.markdown_percentage)::decimal,2) as bl_recommended_offer_percentage,
                CASE WHEN SUM(bl.sales_units) > 0 THEN (SUM(bl.effective_price_point * bl.sales_units) / SUM(bl.sales_units))
                    ELSE AVG(bl.effective_price_point) END as bl_selling_price,
                round(sum(bl.sales_units)::decimal,2) as bl_sales_units,
                round(sum(bl.margin)::decimal,2) as bl_margin,
                round(sum(bl.revenue)::decimal,2) as bl_revenue,
                round(avg(tsd.previous_markdown_percentage)::decimal,2) as bl_previous_markdown_percentage,
                round(avg(tsd.average_retail_price)::decimal, 2) as base_price,
                coalesce(min(tsd.approval_status),''Not Approved'') as approval_status,
                sdc.pcd_start_date,
                sdc.pcd_end_date,
                avg(sdc.price) as average_retail_price,
                array_agg(distinct pm.l0_cuq) as brand,
                array_agg(distinct pm.l1_cuq) as division,
                array_agg(distinct pm.l2_cuq) as department,
				array_agg(distinct pm.l5_cuq) as style,
                array_agg(distinct pm.l6_cuq) as color,
                array_agg(distinct pm.l7_cuq) as size,
				array_agg(distinct pm.product_name) as product_name,
				case
			        when sdc.channel_info = ''Omni'' then avg(pm.max_age)
			        when sdc.channel_info = ''Store'' then avg(pm.store_age)
			        else avg(pm.ecom_age)
			    end as age,
                coalesce(sum(bl.rem_inv) filter(where bl.recommendation_date = sdc.pcd_end_date), 0) as bl_inventory,
                round(sum(bl.spend)::decimal, 2) as bl_markdown_dollar
            from
                sku_store_date_cte sdc
            left join
                (select * from price_markdown.tb_ssd_fin where strategy_id = %1$s) bl
            on bl.product_id = sdc.product_id and bl.store_id = sdc.store_id and bl.pcd_id = sdc.pcd_id
            left join
                price_markdown.tb_strategy_discount_%1$s tsd
            on tsd.product_level_id = sdc.product_level_id and tsd.store_level_id = sdc.store_level_id and tsd.pcd_id = sdc.pcd_id
            join price_markdown.product_master pm on pm.product_id = sdc.product_id
            %4$s
            %5$s
            %6$s
            group by
                sdc.strategy_id,
                %7$s
                %8$s
                sdc.pcd_id,
                sdc.pcd_start_date,
                sdc.pcd_end_date,
				sdc.channel_info
        ) s
        full outer join ending_rule on true;
    ', _strategy_id::text, bl_override_pg_select, bl_override_sg_select, bl_override_pg_join, 
      bl_override_sg_join, bl_override_pcd_where, bl_override_pg_group_by, bl_override_sg_group_by);

    return bl_override_temp_table_query;
end;
$function$
;
