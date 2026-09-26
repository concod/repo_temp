--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_filter_store_groups runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_filter_store_groups

DROP FUNCTION IF EXISTS price_promo.fn_filter_store_groups;
CREATE OR REPLACE FUNCTION price_promo.fn_filter_store_groups(
    p_store_hierarchies jsonb,
    p_store_ids int[],
    p_event_id int
)
RETURNS TABLE(store_group_id int)
LANGUAGE plpgsql
AS $function$
DECLARE
    _event_store_selection_type text;
    _query text;
    _filtered_store_group_ids int[];
	_ineligible_store_group_ids int[];
    _store_hierarchy_condition text = '';
	r record;
BEGIN

    for r in (select * from jsonb_each(p_store_hierarchies)) loop
        if r.value = '[]'::jsonb or r.value is null then
            continue;
        end if;
		raise notice 'value: %', r.value;
        _store_hierarchy_condition = _store_hierarchy_condition || format(
            '
            and (array_length(%2$L::int[],1) is null or (shad.%1$s && %2$L::int[]))
            ',
			r.key,
            array(select jsonb_array_elements_text(r.value))::int[]
        );
    end loop;

    _query = format(
        '
            select
                array_agg(sg_id)
            from global.mvw_sg_hierarchy_agg_data shad
            where 
            true
            %1$s
        ',
        _store_hierarchy_condition
    );

    raise notice 'filtered store group ids query: %', _query;
    execute _query into _filtered_store_group_ids;

    raise notice 'Filtered store group ids: %', _filtered_store_group_ids;
    
    if array_length(p_store_ids,1) is not null then
        select 
            array_agg(sg_id) into _filtered_store_group_ids
        FROM
            pricesmart.tb_sg_store tss
        where 
            tss.sg_id = any(_filtered_store_group_ids) and
            tss.store_id = any(p_store_ids);
    end if;

    raise notice 'Filtered store group ids after store id filter: %', _filtered_store_group_ids;

    if p_event_id is not null then 
        select store_selection_type into _event_store_selection_type
        from price_promo.event_master
        where event_id = p_event_id;

        if _event_store_selection_type = 'store_group' then
            select array_agg(distinct iepg.store_group_id) into _filtered_store_group_ids
            from price_promo.included_event_store_groups iepg
            where iepg.store_group_id = any(_filtered_store_group_ids) and event_id = p_event_id;
        elsif coalesce(nullif(_event_store_selection_type,''),'all_stores') != 'all_stores' then
            select array_agg(distinct tss.sg_id) into _ineligible_store_group_ids
            from pricesmart.tb_sg_store tss
            where tss.sg_id = any(_filtered_store_group_ids)
            and tss.store_id not in (
                select store_id
                from price_promo.included_event_stores ies
                where event_id = p_event_id
            );

            select array_agg(s.store_group_id) into _filtered_store_group_ids
            from (select unnest(_filtered_store_group_ids) store_group_id) s
            where not s.store_group_id = any(_ineligible_store_group_ids);

        end if;
        raise notice 'Filtered store group ids after event filter: %', _filtered_store_group_ids;
    end if;


    return query (select unnest(_filtered_store_group_ids) store_group_id);

END;
$function$
;

