--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_fetch_product_group_landing_page_data_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_fetch_product_group_landing_page_data_10

DROP FUNCTION if exists price_promo.fn_fetch_product_group_landing_page_data;
CREATE OR REPLACE FUNCTION price_promo.fn_fetch_product_group_landing_page_data(
    p_product_hierarchy_filters jsonb default '{}'::jsonb,
	_pg_grouping_type integer DEFAULT '-1'::integer,
	p_event_id integer default null,
	p_with_exclusions bool default false
)
 RETURNS TABLE(
	product_group_id integer,
	product_group_name character varying,
	product_group_description text,
	product_group_type text,
	created_by_user character varying,
	created_at timestamp with time zone,
	modified_by_user character varying,
	group_under_process smallint,
	modified_at timestamp with time zone,
	products_count integer,
	markdown_products_count integer,
	is_excluded_in_event bool,
	l0_name text[],
	l1_name text[],
	l2_name text[],
	strategies_count bigint,
	promos_count bigint
)
 LANGUAGE plpgsql
AS $function$
declare
	final_product_group_ids_query text;
	final_query text;
	pg_types_filter text := '';
	final_pg_ids integer[];
	_event_record price_promo.event_master%ROWTYPE;
	_ineligible_product_groups integer[];
	_final_pg_ids_length integer;
	_event_excluded_product_groups integer[] := array[]::int[];
    _where_condition text[];
    _product_hierarchy_config jsonb;
    _config_record record;
begin
	if p_event_id is not null then 
		select * into _event_record 
		from price_promo.event_master
		where event_id = p_event_id;
	end if;


    _product_hierarchy_config = (select config_value::jsonb from price_promo.tb_tool_configurations
    where module = 'product' and config_name = 'hierarchy_filters');

	raise notice '_event_id: %', p_event_id;
	raise notice '_event_record product inclusion type: %', _event_record.product_inclusion_type;

    for _config_record in select * from jsonb_each(_product_hierarchy_config) loop
        if _config_record.value->>'mvw_pg_column' is null then
            continue;
        end if;
        _where_condition = array_append(
            _where_condition,
            format(
                '(
                    coalesce(array_length(%1$L::int[], 1),0) = 0
                    or 
                    %2$s is null
                    or
                    %1$L::int[] @> %2$s
                )',
                coalesce(
                    ARRAY(SELECT jsonb_array_elements_text(p_product_hierarchy_filters[_config_record.key]))::int[],
                    array[]::int[] 
                ),
                _config_record.value->>'mvw_pg_column'
            )
        );
    end loop;

	final_product_group_ids_query = format(
        'select array_agg(pg_id) from global.mvw_pg_hierarchy_agg_data where %1$s ',
        array_to_string(_where_condition,' and ') 
    );

    raise notice 'final_product_group_ids_query: %', final_product_group_ids_query;

	execute final_product_group_ids_query into final_pg_ids;
	raise notice 'final_pg_ids: % ', final_pg_ids;

	raise notice '_event_record.product_inclusion_type: %', _event_record.product_inclusion_type;
	_final_pg_ids_length = coalesce(array_length(final_pg_ids, 1),0);

	if p_with_exclusions THEN
		select 
			array_agg(eepg.product_group_id) into _event_excluded_product_groups
		from price_promo.excluded_event_product_groups eepg
		where eepg.event_id = p_event_id;

		final_pg_ids = array(select unnest(final_pg_ids) union select unnest(_event_excluded_product_groups));
	elsif _final_pg_ids_length > 0 and _event_record.product_inclusion_type in ('specific_products','whole_category') then 
		select array_agg(distinct tpp.pg_id) into _ineligible_product_groups from 
		global.tb_pg_product tpp 
		where tpp.product_id not in (
			select s.product_id from price_promo.fn_get_products_based_on_event(p_event_id) s
		)
		and tpp.pg_id = any(final_pg_ids);
		select array_agg(tpg.pg_id) into final_pg_ids
		from global.tb_product_group tpg
		where tpg.pg_id = any(final_pg_ids)
		and not tpg.pg_id = any(_ineligible_product_groups)
		and tpg.products_count > 0;
	elsif _final_pg_ids_length >0 and _event_record.product_inclusion_type = 'product_group' then
		select array_agg(distinct iepg.product_group_id) into final_pg_ids
		from price_promo.included_event_product_groups iepg
		where event_id = p_event_id;

	end if;



	if _pg_grouping_type = 0 then
		pg_types_filter = 'and tpg.pg_grouping_type = 0';
	elseif _pg_grouping_type = 1 then
		pg_types_filter = 'and tpg.pg_grouping_type = 1';
	end if;
	raise notice 'pg_types_filter: %', pg_types_filter;

	
 	final_query = format('with pg_data_cte as(
			    select
			        tpg.pg_id as product_group_id,
			        tpg.pg_name as product_group_name,
			        tpg.description as product_group_description,
					case
						when tpg.pg_grouping_type = 1 then ''Whole Category''
						else ''Specific Products''
					end as product_group_type,
			        usr.name as created_by_user,
			        tpg.created_at,
			        user_updated_by_table.name as modified_by_user,
			        case
			            when tpg.created_at <> tpg.updated_at then tpg.updated_at
			            else null
			        end as modified_at,
			        tpg.products_count,
                    tpgpc.products_count as markdown_products_count,
					tpg.is_under_processing as group_under_process
			    from
			        global.tb_product_group tpg
			    left join global.user_master usr on
			        usr.user_code = tpg.created_by
			    left join global.user_master user_updated_by_table on
			        user_updated_by_table.user_code = tpg.updated_by
                left join price_markdown.tb_product_group_products_count tpgpc
                on tpgpc.product_group_id = tpg.pg_id
			    where
					tpg.pg_id in (%1$s)
			        and tpg.is_deleted = 0
					%2$s
			),
			pg_hierarchy_data as(
				select
					pdc.product_group_id,
					tph.hierarchy_level,
					thcm.hierarchy_name
				from
					pg_data_cte pdc
				inner join
					global.tb_pg_hierarchy tph on pdc.product_group_id = tph.pg_id
				left join
				 	global.tb_hierarchy_cid_mapping thcm on tph.hierarchy_level = thcm.hierarchy_level and  tph.hierarchy_value = thcm.hierarchy_value
				where
					tph.hierarchy_level in (0, 1, 2)
					and tph.is_temporary = 0
				group by
					pdc.product_group_id,
					tph.hierarchy_level,
					thcm.hierarchy_name
			),
			pg_strategy_map_cte as(
			    select
			        pdc.product_group_id,
			        count(tspg.strategy_id) as strategies
			    from
			        pg_data_cte pdc
			    left join
			        price_markdown.tb_strategy_product_groups tspg on pdc.product_group_id = tspg.product_group_id
			    group by
			        pdc.product_group_id
			),
			pg_promo_map_cte as(
			    select
			        pdc.product_group_id,
			        count(tppg.promo_id) as promos
			    from
			        pg_data_cte pdc
			    left join
                    (
                        select pg_id as product_group_id,promo_id from price_promo.excluded_product_groups
						inner join price_promo.promo_master pm using(promo_id)
                        where pg_id in (select product_group_id from pg_data_cte)
						and pm.status not in(6)
                        union 
                        select product_group_id,promo_id from price_promo.included_promo_product_groups 
						inner join price_promo.promo_master pm using(promo_id)
                        where product_group_id in (select product_group_id from pg_data_cte)
						and pm.status not in(6)
                    ) tppg on pdc.product_group_id = tppg.product_group_id
			    group by
			        pdc.product_group_id
			)
			select
                sdc.product_group_id,
                sdc.product_group_name::varchar,
                sdc.product_group_description,
                sdc.product_group_type,
                sdc.created_by_user,
                sdc.created_at,
                sdc.modified_by_user,
                sdc.group_under_process,
                sdc.modified_at,
                sdc.products_count,
                sdc.markdown_products_count,
				case when sdc.product_group_id = any(%3$L) then true else False end as is_excluded_in_event,
                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 0 and phd.product_group_id = sdc.product_group_id) as l1_name,
                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 1 and phd.product_group_id = sdc.product_group_id) as l2_name,
                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 2 and phd.product_group_id = sdc.product_group_id) as l2_name,
                ssmc.strategies as strategies_count,
                spmc.promos as promos_count
            from
			    pg_data_cte sdc
			inner join
			    pg_strategy_map_cte ssmc using(product_group_id)
			inner join
			    pg_promo_map_cte spmc using(product_group_id)
			%4$s
			',
			array_to_string(coalesce(final_pg_ids, array[-1]), ','),
			pg_types_filter,
			_event_excluded_product_groups,
			case 
			when p_with_exclusions 
				then 'order by is_excluded_in_event desc' 
			else '' 
			end
		);

	raise notice 'final_query : %', final_query;
	return query execute final_query;
end;
$function$
;
