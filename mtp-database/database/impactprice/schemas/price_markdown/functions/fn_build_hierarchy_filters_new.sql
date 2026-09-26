--liquibase formatted sql
--changeset anoop.madamsetty@impactanalytics.co:fn_build_hierarchy_filters_new-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Function to build hierarchy filter conditions for strategy queries - includes WHERE clause building

DROP FUNCTION if exists price_markdown.fn_build_hierarchy_filters_new;

CREATE OR REPLACE FUNCTION price_markdown.fn_build_hierarchy_filters_new(
    p_hierarchy_filters jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(
    strategy_where_conditions text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    -- Dynamic hierarchy variables
    _product_hierarchy_conditions text[] := '{}';
    _store_hierarchy_conditions text[] := '{}';
    _strategy_where_arr text[] := '{}';
    _hierarchy_key text;
    _hierarchy_value jsonb;
    _hierarchy_ids integer[];
    _hierarchy_level integer;
    _condition_template text;
BEGIN
    -- Build dynamic product hierarchy conditions and aggregations using same pattern as fn_list_strategy_configs
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
                _product_hierarchy_conditions := array_append(
                    _product_hierarchy_conditions,
                    format('(array_length(array[%1$s]::int[],1) is null or exists (
                        select 1 from price_markdown.tb_strategy_hierarchy tsh_prod
                        where tsh_prod.strategy_id = sm.strategy_id
                        and tsh_prod.is_product_hierarchy = 1
                        and tsh_prod.hierarchy_level = %2$s
                        and tsh_prod.hierarchy_value = ANY(array[%1$s]::int[])
                    ))', array_to_string(_hierarchy_ids, ','), _hierarchy_level)
                );

                RAISE NOTICE 'Added product hierarchy condition for %: level=%, ids=%', _hierarchy_key, _hierarchy_level, _hierarchy_ids;
            ELSE
                -- Handle as store hierarchy
                _store_hierarchy_conditions := array_append(
                    _store_hierarchy_conditions,
                    format('(array_length(array[%2$s]::int[],1) is null or s%1$s_ids && array[%2$s]::bigint[])',
                        _hierarchy_level,
                        array_to_string(_hierarchy_ids, ','))
                );

                RAISE NOTICE 'Added store hierarchy condition for %: level=%, ids=%', _hierarchy_key, _hierarchy_level, _hierarchy_ids;
            END IF;

        END LOOP;
    end if;

    -- If no conditions were built, apply default behavior
    IF array_length(_product_hierarchy_conditions, 1) IS NULL AND array_length(_store_hierarchy_conditions, 1) IS NULL THEN
        -- No hierarchy filters provided, no additional filtering needed
        RAISE NOTICE 'No hierarchy filters provided';
    END IF;

    -- Build the complete store hierarchy filter if any store conditions exist
    IF array_length(_store_hierarchy_conditions, 1) > 0 THEN
        _strategy_where_arr := array_append(_strategy_where_arr, format('and sm.strategy_id IN (
            select strategy_id
            from price_markdown.tb_strategy_store_hierarchies tsh
            where %s
        )', array_to_string(_store_hierarchy_conditions, ' and ')));
    END IF;

    -- Add all product hierarchy conditions to strategy_where_arr
    IF array_length(_product_hierarchy_conditions, 1) > 0 THEN
        _strategy_where_arr := array_append(_strategy_where_arr, format('and (%s)',
            array_to_string(_product_hierarchy_conditions, ' and ')));
    END IF;

    -- Return the complete WHERE conditions
    RETURN QUERY SELECT _strategy_where_arr;
END;
$function$
;
