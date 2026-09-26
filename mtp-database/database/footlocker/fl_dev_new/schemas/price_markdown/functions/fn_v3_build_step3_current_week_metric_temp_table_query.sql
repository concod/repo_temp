--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_build_step3_current_week_metric_temp_table_query_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_build_step3_current_week_metric_temp_table_query_6
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_build_step3_current_week_metric_temp_table_query;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_build_step3_current_week_metric_temp_table_query(_strategy_id integer, _product_level integer, _store_level integer, _pcd_ids integer[] DEFAULT NULL::integer[], _client_timezone text DEFAULT 'US/Eastern'::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_week_metric_pg_select text = '';
    current_week_metric_sg_select text = '';
    current_week_metric_pg_join text = '';
    current_week_metric_sg_join text = '';
    current_week_metric_pcd_where text = '';
    current_week_metric_pg_group_by text = '';
    current_week_metric_sg_group_by text = '';
    current_week_metric_temp_table_query text;
BEGIN
    -- constructing product and store level selection and grouping
	select product_select, product_group_by, store_select, store_group_by
    into current_week_metric_pg_select, current_week_metric_pg_group_by, current_week_metric_sg_select, current_week_metric_sg_group_by
    from price_markdown.fn_v3_get_step3_level_selection_and_grouping(_product_level, _store_level);

    -- adding pcd id condition if available
    if _pcd_ids is not null then 
        current_week_metric_pcd_where := format('where sdc.pcd_id in (%1$s)', array_to_string(_pcd_ids, ','));
    end if;

    -- adding the joins for product and store level filters
    if _product_level = -100 then 
        current_week_metric_pg_join := format('inner join (
                                        select pg_id, pg_name 
                                        from pricesmart.tb_product_group 
                                        where pg_id in (
                                            select product_group_id 
                                            from price_markdown.tb_strategy_product_groups 
                                            where strategy_id = %1$s
                                        )
                                    ) pg on pg.pg_id = sdc.product_group_id', _strategy_id::text);
	else
		current_week_metric_pg_join := 'inner join price_markdown.product_master pm on pm.product_id = sdc.product_id';
	end if;

    if _store_level = -100 then 
        current_week_metric_sg_join := format('inner join (
                                        select sg_id, sg_name 
                                        from pricesmart.tb_store_group 
                                        where sg_id in (
                                            select store_group_id 
                                            from price_markdown.tb_strategy_store_groups 
                                            where strategy_id = %1$s
                                        )
                                    ) sg on sg.sg_id = sdc.store_group_id', _strategy_id::text);
    else
        current_week_metric_sg_join := 'inner join price_markdown.tb_store_master sm on sm.store_id = sdc.store_id';
    end if;

    -- final query construction for temporary table
    current_week_metric_temp_table_query := format('
		create temp table current_week_metric_cte on commit drop as 
        select
            sdc.strategy_id,
            %2$s
            %3$s
            sdc.pcd_id,
            round(avg(metrics.markdown_percentage)::decimal, 2) as cw_offer_percentage
        from
            sku_store_date_cte sdc
            left join
            (select * from price_markdown.tb_strategy_discount where strategy_id = %1$s) metrics
            on metrics.product_level_id = sdc.product_level_id and metrics.store_level_id = sdc.store_level_id and metrics.pcd_id = sdc.pcd_id
            %4$s
            %5$s
        where 
            date(timezone(%6$L, now())) between sdc.pcd_start_date and sdc.pcd_end_date
        group by
            sdc.strategy_id,
            %7$s
            %8$s
            sdc.pcd_id;
    ', 	_strategy_id::text, current_week_metric_pg_select, current_week_metric_sg_select, current_week_metric_pg_join, 
		current_week_metric_sg_join, _client_timezone, current_week_metric_pg_group_by, current_week_metric_sg_group_by);

    return current_week_metric_temp_table_query;
end;
$function$
;
