--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:pricesmart.fn_fetch_store_group_landing_page_data_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_fetch_store_group_landing_page_data_1

DROP FUNCTION if exists pricesmart.fn_fetch_store_group_landing_page_data;

CREATE OR REPLACE FUNCTION pricesmart.fn_fetch_store_group_landing_page_data(_store_hierarchy jsonb DEFAULT NULL::jsonb, _store_group_ids integer[] DEFAULT NULL::integer[], p_event_id integer default null)
 RETURNS TABLE(store_group_id integer, store_group_name text, store_group_description text, created_by_user character varying, created_at timestamp with time zone, modified_by_user character varying, modified_at timestamp with time zone, stores_count integer, s0_name character varying[], s1_name character varying[], s2_name character varying[], group_under_process smallint, strategies_count bigint, promos_count bigint)
 LANGUAGE plpgsql
AS $function$
declare
	temp2_query text;
	final_query text;
	final_sg_ids integer[];
	_event_store_selection_type text;
	_ineligible_store_group_ids int[];
begin
	
	if _store_group_ids is not null and array_length(_store_group_ids, 1) > 0 then
		final_sg_ids = _store_group_ids;
	else 
		temp2_query ='select array_agg(sg_id) from pricesmart.tb_sg_hierarchy_agg_data where %1$s ';
		temp2_query = format(temp2_query, pricesmart.fn_get_sg_landing_page_where_clause(_store_hierarchy));
		raise notice 'temp2_query: % ', temp2_query;
		execute temp2_query into final_sg_ids;
	end if;

	if p_event_id is not null then 
        select store_selection_type into _event_store_selection_type
        from price_promo.event_master
        where event_id = p_event_id;

        if _event_store_selection_type = 'store_group' then
            select array_agg(distinct iepg.store_group_id) into final_sg_ids
            from price_promo.included_event_store_groups iepg
            where iepg.store_group_id = any(final_sg_ids) and event_id = p_event_id;
        elsif coalesce(nullif(_event_store_selection_type,''),'all_stores') != 'all_stores' then
            select array_agg(distinct tss.sg_id) into _ineligible_store_group_ids
            from global.tb_sg_store tss
            where tss.sg_id = any(final_sg_ids)
            and tss.store_id not in (
                select store_id
                from price_promo.included_event_stores ies
                where event_id = p_event_id
            );

            select array_agg(s.store_group_id) into final_sg_ids
            from (select unnest(final_sg_ids) store_group_id) s
            where not s.store_group_id = any(_ineligible_store_group_ids);

        end if;
        raise notice 'Filtered store group ids after event filter: %', final_sg_ids;
    end if;

	raise notice 'final_sg_ids: % ', final_sg_ids;
	
 	final_query = format('with sg_data_cte as(
			        select
			            tsg.sg_id as store_group_id,
			            tsg.sg_name as store_group_name,
			            tsg.description as store_group_description,
			            um.name as created_by_user,
			            tsg.created_at,
			            uum.name as modified_by_user,
			            case
			                when tsg.created_at <> tsg.updated_at then tsg.updated_at
			                else null
			            end modified_at,
			            tsg.stores_count,
			            array_agg(distinct sm.s0_name) as  s0_name,
			            array_agg(distinct sm.s1_name) as  s1_name,
			            array_agg(distinct sm.s2_name) as  s2_name,
			            tsg.is_under_processing as group_under_process
			        from
			            pricesmart.tb_store_group tsg
			        inner join 
			            pricesmart.tb_sg_store tss on tss.sg_id = tsg.sg_id
			        inner join 
			            pricesmart.tb_store_master sm on sm.store_id = tss.store_id
			        left join global.user_master um on
			            um.user_code = tsg.created_by
			        left join global.user_master uum on
			            uum.user_code = tsg.updated_by
			        where
			            tsg.sg_id in (%1$s)
			            and tsg.is_deleted <> 1
			        group by
			            store_group_id,
			            store_group_name,
			            store_group_description,
			            created_by_user,
			            tsg.created_at,
			            modified_by_user,
			            modified_at
			    ),
			    sg_strategy_map_cte as(
			        select 
			            sdc.store_group_id,
			            count(tssg.strategy_id) as strategies
			        from 
			            sg_data_cte sdc
			        left join 
			            price_markdown.tb_strategy_store_groups tssg on sdc.store_group_id = tssg.store_group_id 
			        group by 
			            sdc.store_group_id
			    ),
			    sg_promo_map_cte as(
			        select 
			            sdc.store_group_id,
			            count(tpsg.promo_id) as promos
			        from 
			            sg_data_cte sdc
			        left join 
			            price_promo.tb_promo_store_groups tpsg on sdc.store_group_id = tpsg.store_group_id 
			        group by 
			            sdc.store_group_id
			    )
			    select 
			        sdc.*,
			        ssmc.strategies as strategies_count,
			        spmc.promos as promos_count
			    from 
			        sg_data_cte sdc
			    inner join 
			        sg_strategy_map_cte ssmc using(store_group_id)
			    inner join 
        			sg_promo_map_cte spmc using(store_group_id)', array_to_string(coalesce(final_sg_ids, array[-1]), ','));

	raise notice 'final_query : %', final_query;
	return query execute final_query;
end;
$function$
;
