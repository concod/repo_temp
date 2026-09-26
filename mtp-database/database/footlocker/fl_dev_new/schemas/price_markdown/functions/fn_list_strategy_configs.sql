--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_list_strategy_configs_8 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: price_markdown.fn_list_strategy_configs_8

drop function if exists price_markdown.fn_list_strategy_configs;
CREATE OR REPLACE FUNCTION price_markdown.fn_list_strategy_configs
(
    p_hierarchy_filters jsonb DEFAULT NULL::jsonb
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
        _product_hierarchy_conditions text[] := '{}';
        _store_hierarchy_conditions text[] := '{}';
        _product_hierarchy_aggregations text[] := '{}';
        _store_hierarchy_aggregations text[] := '{}';
        _hierarchy_key text;
        _hierarchy_value jsonb;
        _hierarchy_level integer;
        _hierarchy_ids integer[];
        _condition_template text;
	begin

        -- Build dynamic product hierarchy conditions and aggregations
        if p_hierarchy_filters is not null then
            FOR _hierarchy_key, _hierarchy_value IN SELECT * FROM jsonb_each(p_hierarchy_filters) LOOP
                
                -- Extract hierarchy IDs array
                _hierarchy_ids := coalesce(
                    (select array_agg(value::integer) 
                     from jsonb_array_elements_text(_hierarchy_value)), 
                    '{}'::integer[]
                );
                
                -- Skip if empty array
                CONTINUE WHEN array_length(_hierarchy_ids, 1) IS NULL;
                
                -- Look up hierarchy level and type from mapping table in single query
                SELECT id_mapping, is_product_hierarchy::text 
                INTO _hierarchy_level, _condition_template
                FROM pricesmart.pricesmart_hierarchy_mapping 
                WHERE request_key = _hierarchy_key
                LIMIT 1;
                
                -- Skip if no mapping found
                IF _hierarchy_level IS NULL THEN
                    RAISE NOTICE 'No mapping found for filter key: %. Skipping this filter.', _hierarchy_key;
                    CONTINUE;
                END IF;
                
                -- Handle based on hierarchy type from mapping table
                IF _condition_template = 'true' THEN  -- is_product_hierarchy = true
                    -- Handle as product hierarchy
                    _product_hierarchy_aggregations := array_append(
                        _product_hierarchy_aggregations,
                        format('coalesce(array_agg(hierarchy_level_id) filter (where hierarchy_level=%1$s),array[]::int[]) as %2$s',
                            _hierarchy_level, _hierarchy_key)
                    );
                    
                    _product_hierarchy_conditions := array_append(
                        _product_hierarchy_conditions,
                        format('(array_length(array[%1$s]::int[],1) is null or array_length(%2$s,1) is null or product_hierarchies_agg.%2$s && array[%1$s]::int[])',
                            array_to_string(_hierarchy_ids, ','), _hierarchy_key)
                    );
                ELSE
                    -- Handle as store hierarchy
                    _store_hierarchy_aggregations := array_append(
                        _store_hierarchy_aggregations,
                        format('array_agg(hierarchy_level_id) filter (where hierarchy_level = %1$s) as %2$s',
                            _hierarchy_level, _hierarchy_key)
                    );
                    
                    _store_hierarchy_conditions := array_append(
                        _store_hierarchy_conditions,
                        format('%1$s && array[%2$s]',
                            _hierarchy_key, array_to_string(_hierarchy_ids, ','))
                    );
                END IF;
                
            END LOOP;
        end if;

        -- If no conditions were built, return empty result
        IF array_length(_product_hierarchy_conditions, 1) IS NULL AND array_length(_store_hierarchy_conditions, 1) IS NULL THEN
            _product_hierarchy_aggregations := array_append(_product_hierarchy_aggregations, 'coalesce(array_agg(hierarchy_level_id) filter (where hierarchy_level=1),array[]::int[]) as l1_ids');
            _product_hierarchy_conditions := array_append(_product_hierarchy_conditions, '1=1');
            _store_hierarchy_aggregations := array_append(_store_hierarchy_aggregations, 'array_agg(hierarchy_level_id) filter (where hierarchy_level = 0) as s0_ids');
            _store_hierarchy_aggregations := array_append(_store_hierarchy_aggregations, 'array_agg(hierarchy_level_id) filter (where hierarchy_level = 1) as s1_ids');
            _store_hierarchy_conditions := array_append(_store_hierarchy_conditions, '1=1');
        END IF;

        -- Build the dynamic query
        _query = format(
            '
            with filtered_strategy_configs as (
                select
                    product_hierarchies_agg.strategy_config_id
                from (
                    select
                        strategy_config_id,
                        %1$s
                    from price_markdown.tb_strategy_config_product_hierarchies
                    group by strategy_config_id
                ) product_hierarchies_agg
                inner join
                (
                    select
                        strategy_config_id,
                        %2$s
                    from
                        price_markdown.tb_strategy_config_store_hierarchies
                    group by strategy_config_id
                ) store_hierarchies
                using (strategy_config_id)
                where
                %3$s
                %4$s
            )
            select
                tsc.strategy_config_id,
                tsc.strategy_config_name,
                tsc.strategy_config_comment,
                tsc.calendar_config_id,
                tcc.config_name as calendar_config_name,
                (tsc.no_of_weeks*7)+ tsc.no_of_days as duration,
                -- onboarding changes to be done here
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
        array_to_string(_product_hierarchy_aggregations, ','),
        array_to_string(_store_hierarchy_aggregations, ','),
        array_to_string(_product_hierarchy_conditions, ' and '),
        CASE 
            WHEN array_length(_store_hierarchy_conditions, 1) > 0 
            THEN ' and ' || array_to_string(_store_hierarchy_conditions, ' and ')
            ELSE ''
        END
        );

    raise notice 'query: %', _query;
    raise notice 'Input hierarchy filters: %', p_hierarchy_filters;

    return query execute _query;

	end;
$function$
;
