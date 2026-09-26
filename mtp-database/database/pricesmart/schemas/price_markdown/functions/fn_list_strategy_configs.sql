--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_list_strategy_configs_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: price_markdown.fn_list_strategy_configs_3

drop function if exists price_markdown.fn_list_strategy_configs;
CREATE OR REPLACE FUNCTION price_markdown.fn_list_strategy_configs
(
    p_l1_ids integer[],
    p_l2_ids integer[],
    p_l3_ids integer[],
    p_l4_ids integer[],
    p_brand_ids integer[],
    p_s0_ids integer[],
    p_s1_ids integer[]
)
 RETURNS Table(
    strategy_config_id integer,
    strategy_config_name text,
    strategy_config_comment text,
    calendar_config_id integer,
    calendar_config_name character varying,
    duration integer,
    product_recommendation_level text,
    store_recommendation_level text,
    sell_through_percent float4,
    gross_margin_percent float4,
    min_discount int,
    max_discount int,
    min_step_size int,
    max_step_size int,
    min_markdowns int,
    max_markdowns int,
    created_by_username character varying
)
 LANGUAGE plpgsql
AS $function$
	DECLARE
        _query text;
        _product_hierarchy_condition text;
	begin

        _query = format(
            '
            with filtered_strategy_configs as (
                select
                    product_hierarchies_agg.strategy_config_id
                from (
                    select
                        strategy_config_id,
                        coalesce(array_agg(hierarchy_level_id) filter (where hierarchy_level=1),array[]::int[]) as l1_ids,
                        coalesce(array_agg(hierarchy_level_id) filter (where hierarchy_level=2),array[]::int[]) as l2_ids,
                        coalesce(array_agg(hierarchy_level_id) filter (where hierarchy_level=3),array[]::int[]) as l3_ids,
                        coalesce(array_agg(hierarchy_level_id) filter (where hierarchy_level=4),array[]::int[]) as l4_ids,
                        array_agg(hierarchy_level_id) filter (where hierarchy_level=-100) as brand_ids
                    from price_markdown.tb_strategy_config_product_hierarchies
                    group by strategy_config_id
                ) product_hierarchies_agg
                inner join
                (
                    select
                        strategy_config_id,
                        array_agg(hierarchy_level_id) filter (where hierarchy_level = 0) as  s0_ids,
                        array_agg(hierarchy_level_id) filter (where hierarchy_level = 1) as  s1_ids
                    from
                        price_markdown.tb_strategy_config_store_hierarchies
                    group by strategy_config_id
                ) store_hierarchies
                using (strategy_config_id)
                where
                (product_hierarchies_agg.l1_ids && array[%1$s])
                and
                (array_length(array[%2$s]::int[],1) is null or array_length(l2_ids,1) is null or product_hierarchies_agg.l2_ids && array[%2$s]::int[])
                and
                (array_length(array[%3$s]::int[],1) is null or array_length(l3_ids,1) is null or product_hierarchies_agg.l3_ids && array[%3$s]::int[])
                and
                (array_length(array[%4$s]::int[],1) is null or array_length(l4_ids,1) is null or product_hierarchies_agg.l4_ids && array[%4$s]::int[])
                and
                (array_length(array[%5$s]::int[],1) is null or array_length(brand_ids,1) is null or product_hierarchies_agg.brand_ids && array[%5$s]::int[])
                and s0_ids && array[%6$s] and s1_ids && array[%7$s]
            )
            select
                tsc.strategy_config_id,
                tsc.strategy_config_name,
                tsc.strategy_config_comment,
                tsc.calendar_config_id,
                tcc.config_name as calendar_config_name,
                (tsc.no_of_weeks*7)+ tsc.no_of_days as duration,
                case when tsc.product_recommendation_level = -200 then ''Overall''
                    when tsc.product_recommendation_level = 0 then ''Division''
                    when tsc.product_recommendation_level = 1 then ''Group''
                    when tsc.product_recommendation_level = 2 then ''Department''
                    when tsc.product_recommendation_level = 3 then ''Class''
                    when tsc.product_recommendation_level = 4 then ''Sub Class''
                    when tsc.product_recommendation_level = 5 then ''Style''
                    when tsc.product_recommendation_level = 6 then ''Style Color''
                    else null
                end as product_recommendation_level,
                case when tsc.store_recommendation_level = -200 then ''Overall''
                    when tsc.store_recommendation_level = 1 then ''Channel''
                    when tsc.store_recommendation_level = 6 then ''Store''
                    else null
                end as store_recommendation_level,
                tsc.sell_through_percent,
                tsc.gross_margin_percent,
                tsc.min_discount,
                tsc.max_discount,
                tsc.min_step_size,
                tsc.max_step_size,
                tsc.min_markdowns,
                tsc.max_markdowns,
                um."name" as created_by_username
            from price_markdown.tb_strategy_config tsc
            left join price_markdown.tb_calendar_config tcc
                on tsc.calendar_config_id = tcc.calendar_config_id
            left join global.user_master um
            on um.user_code = tsc.created_by
            where
			 	tsc.is_active = 1
				and	tsc.strategy_config_id in (
	                select fsc.strategy_config_id from filtered_strategy_configs fsc
	            );
        ',
        array_to_string(p_l1_ids,','),
        array_to_string(p_l2_ids,','),
        array_to_string(p_l3_ids,','),
        array_to_string(p_l4_ids,','),
        array_to_string(p_brand_ids,','),
        array_to_string(p_s0_ids,','),
        array_to_string(p_s1_ids,',')
        );

    raise notice 'query: %', _query;


    return query execute _query;

	end;
$function$
;
