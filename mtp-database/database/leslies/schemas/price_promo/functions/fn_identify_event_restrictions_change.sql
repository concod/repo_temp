--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_identify_event_restrictions_change runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_identify_event_restrictions_change

DROP FUNCTION if exists price_promo.fn_identify_event_restrictions_change;
CREATE OR REPLACE FUNCTION price_promo.fn_identify_event_restrictions_change(
    p_event_id int,
    p_event_model price_promo.event_model
)
 RETURNS table(
    restrictions_change varchar(100),
    product_restrictions_change varchar(100),
    store_restrictions_change varchar(100)
 )
LANGUAGE plpgsql
AS $function$
declare
    _event_record record;
    _product_groups_change bool := false;
    _products_change bool := false;
    _stores_change bool := false;
    _store_groups_change bool := false;
    _whole_category_change bool := false;
    _no_restrictions_earlier_and_now bool := false;
    _removed_restrictions bool := false;
    _modified_restriction_levels bool := false;

    _MODIFIED_RESTRICTIONS_MSG constant varchar(100) := 'modified restrictions';
    _NO_CHANGES_MSG constant varchar(100) := 'no changes';
    _REMOVED_RESTRICTIONS_MSG constant varchar(100) := 'removed restrictions';

    _restrictions_change varchar(100) := _NO_CHANGES_MSG;
    _product_restrictions_change varchar(100) := _NO_CHANGES_MSG;
    _store_restrictions_change varchar(100) := _NO_CHANGES_MSG;
begin

    select 
        em.event_id,
        em.product_inclusion_type,
        em.store_selection_type,
        em.has_locked_product_selection,
        em.has_locked_store_selection
    from price_promo.event_master em
    where em.event_id = p_event_id 
    into _event_record;

    _no_restrictions_earlier_and_now = (_event_record.product_inclusion_type = '' and (p_event_model).product_restriction.product_restriction_level = '' 
        and _event_record.store_selection_type = '' and (p_event_model).store_restriction.store_restriction_level = '');
    raise notice 'no_restrictions_earlier_and_now: %', _no_restrictions_earlier_and_now;
    if _no_restrictions_earlier_and_now is true then
        return query (select _NO_CHANGES_MSG, _NO_CHANGES_MSG, _NO_CHANGES_MSG);
        return;
    end if;

    raise notice 'product_inclusion_type: %', _event_record.product_inclusion_type;
    raise notice 'product_restriction_level: %', (p_event_model).product_restriction.product_restriction_level;
    if _event_record.has_locked_product_selection is false and (p_event_model).product_restriction.lock is true then
        _product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG;
    elsif _event_record.product_inclusion_type = (p_event_model).product_restriction.product_restriction_level then
        if _event_record.product_inclusion_type = 'whole_category' then
            _whole_category_change = exists(
                with user_selected_hierarchies as (
                select
                    coalesce(l0_cid, '{}'::int8[]) as l0_cid,
                    coalesce(l1_cid, '{}'::int8[]) as l1_cid,
                    coalesce(l2_cid, '{}'::int8[]) as l2_cid,
                    coalesce(l3_cid, '{}'::int8[]) as l3_cid,
                    coalesce(l4_cid, '{}'::int8[]) as l4_cid,
                    coalesce(brand_cid, '{}'::int8[]) as brand_cid,
                    coalesce(lifecycle_indicator_id, '{}'::int8[]) as lifecycle_indicator_id
                from
                    jsonb_to_record(
                        (p_event_model).product_restriction.hierarchy_data
                    ) as hd (
                    l0_cid int8[],
                    l1_cid int8[],
                    l2_cid int8[],
                    l3_cid int8[],
                    l4_cid int8[],
                    brand_cid int8[],
                    lifecycle_indicator_id int8[]
                    )
                ),
                event_current_hierarchies  as (
                select 
                    coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = 0), '{}'::int8[]) as l0_cid,
                    coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = 1), '{}'::int8[]) as l1_cid,
                    coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = 2), '{}'::int8[]) as l2_cid,
                    coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = 3), '{}'::int8[]) as l3_cid,
                    coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = 4), '{}'::int8[]) as l4_cid,
                    coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = -1), '{}'::int8[]) as brand_cid,
                    coalesce(array_agg(hierarchy_value_id) filter (where hierarchy_level_id = -2), '{}'::int8[]) as lifecycle_indicator_id
                from price_promo.included_event_product_hierarchy ieph
                where event_id = p_event_id
                )
                select 1
                from event_current_hierarchies ech,
                user_selected_hierarchies ush
                where 
                    (not ech.l0_cid @> ush.l0_cid or not ech.l0_cid <@ ush.l0_cid)
                    or (not ech.l1_cid @> ush.l1_cid or not ech.l1_cid <@ ush.l1_cid)
                    or (not ech.l2_cid @> ush.l2_cid or not ech.l2_cid <@ ush.l2_cid)
                    or (not ech.l3_cid @> ush.l3_cid or not ech.l3_cid <@ ush.l3_cid)
                    or (not ech.l4_cid @> ush.l4_cid or not ech.l4_cid <@ ush.l4_cid)
                    or (not ech.brand_cid @> ush.brand_cid or not ech.brand_cid <@ ush.brand_cid)
                    or (not ech.lifecycle_indicator_id @> ush.lifecycle_indicator_id or not ech.lifecycle_indicator_id <@ ush.lifecycle_indicator_id)

            );
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

    return query (
        select 
            case 
                when (
                    _product_restrictions_change = _REMOVED_RESTRICTIONS_MSG and _store_restrictions_change = _REMOVED_RESTRICTIONS_MSG
                ) then _REMOVED_RESTRICTIONS_MSG
                when (
                    _product_restrictions_change = _MODIFIED_RESTRICTIONS_MSG or _store_restrictions_change = _MODIFIED_RESTRICTIONS_MSG
                ) then _MODIFIED_RESTRICTIONS_MSG
                else _NO_CHANGES_MSG
            end as restrictions_change,
            _product_restrictions_change,
            _store_restrictions_change
    );

end;
$function$
;