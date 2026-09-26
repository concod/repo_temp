--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_build_step3_ia_recc_temp_table_query_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_build_step3_ia_recc_temp_table_query_4
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_build_step3_ia_recc_temp_table_query;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_build_step3_ia_recc_temp_table_query(_strategy_id integer, _product_level integer, _store_level integer, _pcd_ids integer[] DEFAULT NULL::integer[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    ia_recc_pg_select text = '';
    ia_recc_sg_select text = '';
    ia_recc_pg_join text = '';
    ia_recc_sg_join text = '';
    ia_recc_pcd_where text = '';
    ia_recc_pg_group_by text = '';
    ia_recc_sg_group_by text = '';
    ia_recc_temp_table_query text;
BEGIN
    -- constructing product and store level selection and grouping
	select product_select, product_group_by, store_select, store_group_by
    into ia_recc_pg_select, ia_recc_pg_group_by, ia_recc_sg_select, ia_recc_sg_group_by
    from price_markdown.fn_v3_get_step3_level_selection_and_grouping(_product_level, _store_level);

    -- adding pcd id condition if available
    if _pcd_ids is not null then 
        ia_recc_pcd_where := format('where sdc.pcd_id in (%1$s)', array_to_string(_pcd_ids, ','));
    end if;

    -- adding the joins for product and store level filters
    if _product_level = -100 then 
        ia_recc_pg_join := format('inner join (
                                        select pg_id, pg_name 
                                        from pricesmart.tb_product_group 
                                        where pg_id in (
                                            select product_group_id 
                                            from price_markdown.tb_strategy_product_groups 
                                            where strategy_id = %1$s
                                        )
                                    ) pg on pg.pg_id = sdc.product_group_id', _strategy_id::text);
	else
		ia_recc_pg_join := 'inner join price_markdown.product_master pm on pm.product_id = sdc.product_id';
	end if;

    if _store_level = -100 then 
        ia_recc_sg_join := format('inner join (
                                        select sg_id, sg_name 
                                        from pricesmart.tb_store_group 
                                        where sg_id in (
                                            select store_group_id 
                                            from price_markdown.tb_strategy_store_groups 
                                            where strategy_id = %1$s
                                        )
                                    ) sg on sg.sg_id = sdc.store_group_id', _strategy_id::text);
    else
        ia_recc_sg_join := 'inner join price_markdown.tb_store_master sm on sm.store_id = sdc.store_id';
    end if;

    -- final query construction for temporary table
    ia_recc_temp_table_query := format('
		create temp table ia_recc_cte on commit drop as 
        select ia.*,
            coalesce(
                CASE WHEN end_rule is NULL THEN round(cast(ia_selling_price as numeric), 2)
                    ELSE ROUND(cast(ia_selling_price -(end_rule/100) as numeric))+(end_rule/100)
                end,
               ROUND(cast(((100-ia_recommended_offer_percentage)*average_retail_price/100) -(end_rule/100) as numeric))+(end_rule/100)
            )
            as ia_effective_price_point
        from (
            select
                sdc.strategy_id,
                %2$s
                %3$s
                sdc.pcd_id,
                round(avg(dis_ia.markdown_percentage)::decimal,2) as ia_recommended_offer_percentage,
                CASE WHEN SUM(ia.sales_units) > 0 THEN (SUM(ia.effective_price_point * ia.sales_units) / SUM(ia.sales_units))
                   ELSE AVG(ia.effective_price_point) END as ia_selling_price,
                round(sum(ia.sales_units)::decimal,2) as ia_sales_units,
                round(sum(ia.margin)::decimal,2) as ia_margin,
                round(sum(ia.revenue)::decimal,2) as ia_revenue,
                round(avg(dis_ia.previous_markdown_percentage)::decimal,2) as ia_previous_markdown_percentage,
                sdc.pcd_start_date,
                sdc.pcd_end_date,
                avg(sdc.price) as average_retail_price,
                coalesce(sum(ia.rem_inv) filter(where ia.recommendation_date = sdc.pcd_end_date), 0) as ia_inventory,
                round(sum(ia.spend)::decimal, 2) as ia_markdown_dollar
            from
                sku_store_date_cte sdc
            left join
                (select * from price_markdown.tb_ssd_ia where strategy_id = %1$s) ia
            on ia.product_id = sdc.product_id and ia.store_id = sdc.store_id and ia.pcd_id = sdc.pcd_id
            left join
                price_markdown.tb_strategy_discount_ia_%1$s dis_ia
            on dis_ia.product_level_id = sdc.product_level_id and dis_ia.store_level_id = sdc.store_level_id and dis_ia.pcd_id = sdc.pcd_id
            %4$s
            %5$s
            %6$s
            group by
                sdc.strategy_id,
                %7$s
                %8$s
                sdc.pcd_id,
                sdc.pcd_start_date,
                sdc.pcd_end_date
        ) ia
        full outer join
        ending_rule on true;
    ', _strategy_id::text, ia_recc_pg_select, ia_recc_sg_select, ia_recc_pg_join, 
      ia_recc_sg_join, ia_recc_pcd_where, ia_recc_pg_group_by, ia_recc_sg_group_by);

    return ia_recc_temp_table_query;
end;
$function$
;
