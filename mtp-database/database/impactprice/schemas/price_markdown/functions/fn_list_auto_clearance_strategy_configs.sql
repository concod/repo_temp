--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:price_markdown.fn_list_auto_clearance_strategy_configs_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_list_auto_clearance_strategy_configs

DROP FUNCTION if exists price_markdown.fn_list_auto_clearance_strategy_configs;

CREATE OR REPLACE FUNCTION price_markdown.fn_list_auto_clearance_strategy_configs(p_hierarchy_filters jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(strategy_config_comment text, calendar_config_id integer, calendar_config_name character varying, duration integer, product_recommendation_level text, store_recommendation_level text, sell_through_percent real, gross_margin_percent real, min_discount integer, max_discount integer, min_step_size integer, max_step_size integer, min_markdowns integer, max_markdowns integer, auto_clearance_id integer, auto_clearance_config_name text, auto_clearance_description text, product_trigger_level text, store_trigger_level text, created_by_username character varying)
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
            with filtered_clearance_trigger_configs as (
                select
                    product_hierarchies_agg.trigger_id
                from (
                    select
                        trigger_id,
                        %1$s
                    from price_markdown.tb_clearance_trigger_product_hierarchies
                    group by trigger_id
                ) product_hierarchies_agg
                inner join
                (
                    select
                        trigger_id,
                        %2$s
                    from
                        price_markdown.tb_clearance_trigger_store_hierarchies
                    group by trigger_id
                ) store_hierarchies
                using (trigger_id)
                where
                %3$s
                %4$s
            )
            select
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
				tctim.trigger_id as auto_clearance_id,
				tctim."name" as auto_clearance_config_name,
				tctim.description as auto_clearance_description,
				case when tctim.product_trigger_level = -200 then ''Overall''
                    when tctim.product_trigger_level = 0 then ''Division''
                    when tctim.product_trigger_level = 1 then ''Group''
                    when tctim.product_trigger_level = 2 then ''Department''
                    when tctim.product_trigger_level = 3 then ''Class''
                    when tctim.product_trigger_level = 4 then ''Sub Class''
                    when tctim.product_trigger_level = 5 then ''Style''
                    when tctim.product_trigger_level = 6 then ''Style Color''
                    else null
                end as product_trigger_level,
                case when tctim.store_trigger_level = -200 then ''Overall''
                    when tctim.store_trigger_level = 1 then ''Channel''
                    when tctim.store_trigger_level = 6 then ''Store''
                    else null
                end as store_trigger_level,
                um."name" as created_by_username
            from price_markdown.tb_strategy_config tsc
			inner join price_markdown.tb_clearance_trigger_info_master tctim
				on tsc.trigger_config_id = tctim.trigger_id 
				and tctim.is_trigger_configured = true and tctim.is_deleted = false
            left join price_markdown.tb_calendar_config tcc
                on tsc.calendar_config_id = tcc.calendar_config_id
            left join global.user_master um
            on um.user_code = tsc.created_by
            where
			 	tsc.is_active = 1
				and	tsc.trigger_config_id in (
	                select fctc.trigger_id from filtered_clearance_trigger_configs fctc
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