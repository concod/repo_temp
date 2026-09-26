--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_identify_event_restrictions_change_new_flow runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_identify_event_restrictions_change_new_flow

DROP FUNCTION if exists price_promo.fn_identify_event_restrictions_change_new_flow;
CREATE OR REPLACE FUNCTION price_promo.fn_identify_event_restrictions_change_new_flow(p_event_id integer, p_event_model price_promo.event_model_new_flow)
 RETURNS TABLE(restrictions_change character varying, product_restrictions_change character varying, store_restrictions_change character varying, customer_restrictions_change character varying)
 LANGUAGE plpgsql
AS $function$
declare
    _event_record record;
    _product_groups_change bool := false;
    _products_change bool := false;
    _stores_change bool := false;
    _store_groups_change bool := false;
    _whole_category_change bool := false;
    _whole_category_change_query text := '';
    _no_restrictions_earlier_and_now bool := false;
    _removed_restrictions bool := false;
    _modified_restriction_levels bool := false;

    _MODIFIED_RESTRICTIONS_MSG constant varchar(100) := 'modified restrictions';
    _NO_CHANGES_MSG constant varchar(100) := 'no changes';
    _REMOVED_RESTRICTIONS_MSG constant varchar(100) := 'removed restrictions';

    _restrictions_change varchar(100) := _NO_CHANGES_MSG;
    _product_restrictions_change varchar(100) := _NO_CHANGES_MSG;
    _store_restrictions_change varchar(100) := _NO_CHANGES_MSG;
    _customer_restrictions_change varchar(100) := _NO_CHANGES_MSG;
    _product_hierarchies_config jsonb;
    _customer_hierarchies_config jsonb;
    select_condition text := '';
    jsonb_to_record_condition text := '';
    select_included_event_product_hierarchy_condition text := '';
    select_event_customer_hierarchy_condition text := '';
    where_condition text := '';
    hierarchy_key TEXT;
    cfg JSONB;
begin

    select config_value::jsonb into _product_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'product' and config_name = 'hierarchy_filters';

    select config_value::jsonb into _customer_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'customer' and config_name = 'hierarchy_filters';

    select 
        em.event_id,
        em.product_inclusion_type,
        em.store_selection_type,
        em.customer_selection_type,
        em.has_locked_product_selection,
        em.has_locked_store_selection,
        em.has_locked_customer_selection
    from price_promo.event_master em
    where em.event_id = p_event_id 
    into _event_record;

    _no_restrictions_earlier_and_now = (_event_record.product_inclusion_type = '' and (p_event_model).product_restriction.product_restriction_level = '' 
        and _event_record.store_selection_type = '' and (p_event_model).store_restriction.store_restriction_level = '');
    raise notice 'no_restrictions_earlier_and_now: %', _no_restrictions_earlier_and_now;
    if _no_restrictions_earlier_and_now is true then
        return query (select _NO_CHANGES_MSG, _NO_CHANGES_MSG, _NO_CHANGES_MSG, _NO_CHANGES_MSG);
        return;
    end if;

    raise notice 'product_inclusion_type: %', _event_record.product_inclusion_type;
    raise notice 'product_restriction_level: %', (p_event_model).product_restriction.product_restriction_level;
    if _event_record.has_locked_product_selection is false and (p_event_model).product_restriction.lock is true then
        _product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
    elsif _event_record.product_inclusion_type = (p_event_model).product_restriction.product_restriction_level then
        if _event_record.product_inclusion_type = 'whole_category' then
            -- forming dynamic store hierarchies for _insert_included_promo_pg_hierarchy_sub_query
            FOR hierarchy_key, cfg IN SELECT * FROM jsonb_each(_product_hierarchies_config)
            LOOP
                IF NOT ((cfg->>'is_linked_to_event')::boolean = true) THEN
                    CONTINUE;
                END IF;
                
                select_condition := select_condition || format(
                    'coalesce(%1$s, ''{}''::int8[]) as %1$s,',
                    hierarchy_key
                );
                
                jsonb_to_record_condition := jsonb_to_record_condition || format(
                    '%1$s int8[],',
                    hierarchy_key
                );

                select_included_event_product_hierarchy_condition = select_included_event_product_hierarchy_condition || format(
                    'coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = %1$s), ''{}''::int8[]) as %2$s,',
                    cfg->>'id',
                    hierarchy_key
                );

                where_condition := where_condition || format(
                    '(not ech.%1$s @> ush.%1$s or not ech.%1$s <@ ush.%1$s) or ',
                    hierarchy_key
                );
            END LOOP;
            -- After the loop (or after the full string is constructed)
            select_condition := rtrim(select_condition, ',');
            jsonb_to_record_condition := rtrim(jsonb_to_record_condition, ',');
            select_included_event_product_hierarchy_condition := rtrim(select_included_event_product_hierarchy_condition, ',');
            where_condition := left(where_condition, length(where_condition) - 4);

            _whole_category_change_query = format(
                '
                select exists(
                    with user_selected_hierarchies as (
                    select
                        %1$s
                    from
                        jsonb_to_record(
                            ''%5$s''::jsonb
                        ) as hd (
                        %2$s
                        )
                    ),
                    event_current_hierarchies  as (
                    select 
                        %3$s
                    from price_promo.included_event_product_hierarchy ieph
                    where event_id = %6$s
                    )
                    select 1
                    from event_current_hierarchies ech,
                    user_selected_hierarchies ush
                    where 
                        %4$s
                );',
                select_condition,
                jsonb_to_record_condition,
                select_included_event_product_hierarchy_condition,
                where_condition,
                (p_event_model).product_restriction.hierarchy_data,
                p_event_id
            );

            raise notice 'whole_category_change_query: %', _whole_category_change_query;

            execute _whole_category_change_query INTO _whole_category_change;

            raise notice 'whole_category_change: %', _whole_category_change;
            if _whole_category_change then
                _product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
            end if;
        elsif _event_record.product_inclusion_type = 'specific_products' then
            _products_change = exists (
                select 1
                where (
                    select array_agg(product_id order by product_id) from price_promo.included_event_products iep
                    where iep.event_id = p_event_id
                ) is distinct from (
                    select array_agg(product_id order by product_id) from (
                        select unnest((p_event_model).product_restriction.products) product_id
                        ) s
                )
            );
            if _products_change then 
                _product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
            end if;
        elsif _event_record.product_inclusion_type = 'product_group' then
            _product_groups_change = exists (
                select 1
                where (
                    select array_agg(product_group_id::int8 order by product_group_id) from price_promo.included_event_product_groups ie
                    where ie.event_id = p_event_id
                ) is distinct from (
                    select array_agg(product_group_id order by product_group_id) from (
                        select unnest((p_event_model).product_restriction.product_groups)
                        product_group_id
                    ) s
                )
            );
            if _product_groups_change then 
                _product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
            end if;
        end if;
    ELSE
        if (p_event_model).product_restriction.product_restriction_level = '' then
            _product_restrictions_change = _REMOVED_RESTRICTIONS_MSG;
        else
            _product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
        end if;
    end if;

    if _event_record.has_locked_store_selection is false and (p_event_model).store_restriction.lock is true then
        _store_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
    elsif _event_record.store_selection_type = (p_event_model).store_restriction.store_restriction_level then
        if _event_record.store_selection_type = 'specific_stores' then
            _stores_change = exists (
                select 1
                where (
                    select array_agg(store_id order by store_id) from price_promo.included_event_stores ies
                    where ies.event_id = p_event_id
                ) is distinct from (
                    select array_agg(store_id order by store_id) from (
                        select unnest((p_event_model).store_restriction.stores) store_id
                    ) s
                )
            );
            if _stores_change then 
                _store_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
            end if;
        elsif _event_record.store_selection_type = 'store_group' then
            _store_groups_change = exists (
                select 1
                where (
                    select array_agg(store_group_id::int8 order by store_group_id) from price_promo.included_event_store_groups iesg
                    where iesg.event_id = p_event_id
                ) is distinct from (
                    select array_agg(store_group_id order by store_group_id) from (
                        select unnest((p_event_model).store_restriction.store_groups)
                        store_group_id
                    ) s
                )
            );
            if _store_groups_change then 
                _store_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
            end if;
        end if;
    ELSE
        if (p_event_model).store_restriction.store_restriction_level = '' then
            _store_restrictions_change = _REMOVED_RESTRICTIONS_MSG;
        else
            _store_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
        end if;
    end if;


    if _event_record.has_locked_customer_selection is false and (p_event_model).customer_restriction.lock is true then
        _customer_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
    
    elsif _event_record.customer_selection_type = (p_event_model).customer_restriction.customer_restriction_level then
        if _event_record.customer_selection_type = 'customer_segment' then

            select_condition := '';
            jsonb_to_record_condition := '';
            select_included_event_product_hierarchy_condition := '';
            select_event_customer_hierarchy_condition := '';
            where_condition := '';

            -- forming dynamic customer hierarchies
            FOR hierarchy_key, cfg IN SELECT * FROM jsonb_each(_customer_hierarchies_config)
            LOOP
                IF NOT ((cfg->>'is_linked_to_event')::boolean = true) THEN
                    CONTINUE;
                END IF;
                
                select_condition := select_condition || format(
                    'coalesce(%1$s, ''{}''::int8[]) as %1$s,',
                    hierarchy_key
                );
                
                jsonb_to_record_condition := jsonb_to_record_condition || format(
                    '%1$s int8[],',
                    hierarchy_key
                );

                select_event_customer_hierarchy_condition = select_event_customer_hierarchy_condition || format(
                    'coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = %1$s), ''{}''::int8[]) as %2$s,',
                    cfg->>'id',
                    hierarchy_key
                );

                where_condition := where_condition || format(
                    '(not ech.%1$s @> ush.%1$s or not ech.%1$s <@ ush.%1$s) or ',
                    hierarchy_key
                );
            END LOOP;
            -- After the loop (or after the full string is constructed)
            select_condition := rtrim(select_condition, ',');
            jsonb_to_record_condition := rtrim(jsonb_to_record_condition, ',');
            select_event_customer_hierarchy_condition := rtrim(select_event_customer_hierarchy_condition, ',');
            where_condition := left(where_condition, length(where_condition) - 4);

            _whole_category_change_query = format(
                '
                select exists(
                    with user_selected_hierarchies as (
                    select
                        %1$s
                    from
                        jsonb_to_record(
                            ''%5$s''::jsonb
                        ) as hd (
                        %2$s
                        )
                    ),
                    event_current_hierarchies  as (
                    select 
                        %3$s
                    from price_promo.tb_event_customer_hierarchy tech
                    where event_id = %6$s
                    )
                    select 1
                    from event_current_hierarchies ech,
                    user_selected_hierarchies ush
                    where 
                        %4$s
                );',
                select_condition,
                jsonb_to_record_condition,
                select_event_customer_hierarchy_condition,
                where_condition,
                (p_event_model).customer_restriction.hierarchy_data,
                p_event_id
            );

            raise notice 'whole_category_change_query: %', _whole_category_change_query;

            execute _whole_category_change_query INTO _whole_category_change;

            raise notice 'whole_category_change: %', _whole_category_change;
            if _whole_category_change then
                _customer_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
            end if;
        end if;
    ELSE
        if (p_event_model).customer_restriction.customer_restriction_level = '' then
            _customer_restrictions_change = _REMOVED_RESTRICTIONS_MSG;
        else
            _customer_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
        end if;
    end if;

    return query (
        select 
            case 
                when (
                    _product_restrictions_change = _REMOVED_RESTRICTIONS_MSG and _store_restrictions_change = _REMOVED_RESTRICTIONS_MSG and  _customer_restrictions_change = _REMOVED_RESTRICTIONS_MSG
                ) then _REMOVED_RESTRICTIONS_MSG
                when (
                    _product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG or _store_restrictions_change = _MODIFIED_RESTRICTIONS_MSG or _customer_restrictions_change = _MODIFIED_RESTRICTIONS_MSG
                ) then _MODIFIED_RESTRICTIONS_MSG
                else _NO_CHANGES_MSG
            end as restrictions_change,
            _product_restrictions_change,
            _store_restrictions_change,
            _customer_restrictions_change
    );

end;
$function$
;
