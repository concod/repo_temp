--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_fetch_product_group_landing_page_data_11 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_fetch_product_group_landing_page_data_11


DROP FUNCTION if exists global.fn_fetch_product_group_landing_page_data;

CREATE OR REPLACE FUNCTION global.fn_fetch_product_group_landing_page_data(_l0_ids integer[] DEFAULT ARRAY[]::integer[], _l1_ids integer[] DEFAULT ARRAY[]::integer[], _l2_ids integer[] DEFAULT ARRAY[]::integer[], _l3_ids integer[] DEFAULT ARRAY[]::integer[], _l4_ids integer[] DEFAULT ARRAY[]::integer[], _brand_ids integer[] DEFAULT ARRAY[]::integer[], _lifecycle_indicator integer[] DEFAULT ARRAY[]::integer[], _pg_grouping_type integer DEFAULT '-1'::integer)
 RETURNS TABLE(product_group_id integer, product_group_name character varying, product_group_description text, product_group_type text, created_by_user character varying, created_at timestamp with time zone, modified_by_user character varying, group_under_process smallint, modified_at timestamp with time zone, products_count integer, markdown_products_count integer, l0_name text[], l1_name text[], l2_name text[], strategies_count bigint, promos_count bigint)
 LANGUAGE plpgsql
AS $function$
declare
	temp1_query text;
	temp2_query text;
	final_query text;
	agg_select text := '';
	where_con1 text := '';
	where_con2 text := '';
	pg_types_filter text := '';
	atleast_one_filter_info_present bool := false;
	final_pg_ids integer[];
	filters_data record;
	final_response json;

	filtered_l0_ids integer[];
	filtered_l1_ids integer[];
	filtered_l2_ids integer[];
	filtered_l3_ids integer[];
	filtered_l4_ids integer[];
	filtered_brand_ids integer[];
	filtered_lifecycle_indicator_ids integer[];
begin
	temp1_query ='select %1$s from price_promo.product_master pm where %2$s';
	-- Fetch the proper filter info using the highest hierarchy that the user provided.
	-- Generate array_agg from id's and where condition to fetch the proper filter info.
	if array_length(_l4_ids, 1) > 0 then
		atleast_one_filter_info_present = true;

		agg_select = '  array_agg(distinct l0_cid) as l0_ids,array_agg(distinct l1_cid) as l1_ids,
						array_agg(distinct l2_cid) as l2_ids,array_agg(distinct l3_cid) as l3_ids,
						array_agg(distinct l4_cid) as l4_ids ';

		where_con1 = format(' pm.l4_cid in(%1$s) ', array_to_string(_l4_ids, ','));

		where_con2 = '	(l0_ids is null or array[%1$s] && l0_ids) and (l1_ids is null or array[%2$s] && l1_ids)
						and (l2_ids is null or array[%3$s] && l2_ids) and (l3_ids is null or array[%4$s] && l3_ids)
						and (l4_ids is null or array[%5$s] && l4_ids) ';
	elseif array_length(_l3_ids, 1) > 0 then
		atleast_one_filter_info_present = true;

		agg_select = '  array_agg(distinct l0_cid) as l0_ids,array_agg(distinct l1_cid) as l1_ids,
						array_agg(distinct l2_cid) as l2_ids,array_agg(distinct l3_cid) as l3_ids,
						null::integer[] as l4_ids';
		where_con1 = format(' pm.l3_cid in(%1$s) ', array_to_string(_l3_ids, ','));

		where_con2 = '	(l0_ids is null or array[%1$s] && l0_ids) and (l1_ids is null or array[%2$s] && l1_ids)
						and (l2_ids is null or array[%3$s] && l2_ids) and (l3_ids is null or array[%4$s] && l3_ids) ';
	elseif array_length(_l2_ids, 1) > 0 then
		atleast_one_filter_info_present = true;
		agg_select = '  array_agg(distinct l0_cid) as l0_ids,array_agg(distinct l1_cid) as l1_ids,
						array_agg(distinct l2_cid) as l2_ids, null::integer[] as l3_ids,
						null::integer[] as l4_ids ';

		where_con1 = format(' pm.l2_cid in(%1$s) ', array_to_string(_l2_ids, ','));

		where_con2 = '	(l0_ids is null or array[%1$s] && l0_ids) and (l1_ids is null or array[%2$s] && l1_ids)
						and (l2_ids is null or array[%3$s] && l2_ids) ';
	elseif array_length(_l1_ids, 1) > 0 then
		atleast_one_filter_info_present = true;
		agg_select = '  array_agg(distinct l0_cid) as l0_ids,array_agg(distinct l1_cid) as l1_ids,
						null::integer[] as l2_ids, null::integer[] as l3_ids, null::integer[] as l4_ids ';

		where_con1 = format(' pm.l1_cid in(%1$s) ', array_to_string(_l1_ids, ','));

		where_con2 = '	(l0_ids is null or array[%1$s] && l0_ids) and (l1_ids is null or array[%2$s] && l1_ids) ';
	elseif array_length(_l0_ids, 1) > 0 then
		atleast_one_filter_info_present = true;
		agg_select = '  array_agg(distinct l0_cid) as l0_ids, null::integer[] as l1_ids, null::integer[] as l2_ids,
						null::integer[] as l3_ids, null::integer[] as l4_ids ';

		where_con1 = format(' pm.l0_cid in(%1$s) ', array_to_string(_l0_ids, ','));

		where_con2 = '	(l0_ids is null or array[%1$s] && l0_ids) ';
	end if;
	if array_length(_brand_ids, 1) > 0 then
		if atleast_one_filter_info_present then
			agg_select = agg_select  || ' ,array['|| array_to_string(_brand_ids, ',') ||'] as brand_ids ';
		else
			agg_select = agg_select  || ' array['|| array_to_string(_brand_ids, ',') ||'] as brand_ids ';
			where_con1 = ' true group by 1';
		end if;
		atleast_one_filter_info_present = true;
	else
		agg_select = agg_select  || ' , null::integer[] as brand_ids ';
	end if;
	if array_length(_lifecycle_indicator, 1) > 0 then
		if atleast_one_filter_info_present then
			agg_select = agg_select  || ' ,array['|| array_to_string(_lifecycle_indicator, ',') ||'] as lifecycle_indicator_ids ';
		else
			agg_select = agg_select  || ' array['|| array_to_string(_lifecycle_indicator, ',') ||'] as lifecycle_indicator_ids ';
			where_con1 = ' true group by 1';
		end if;
	else
		agg_select = agg_select  || ' , null::integer[] as lifecycle_indicator_ids ';
	end if;
--	raise notice 'agg_select : %', agg_select;
--	raise notice 'where_con1 : %', where_con1;

	temp1_query = format(temp1_query, agg_select, where_con1);
	raise notice 'temp1_query : %', temp1_query;
	execute temp1_query into filters_data;
--	raise notice 'filters_data : %', filters_data;

	-- filters_data.l0_ids.
	if array_length(_l0_ids, 1) > 0 then
		filtered_l0_ids = _l0_ids;
	else
		filtered_l0_ids = filters_data.l0_ids;
	end if;
	-- filters_data.l1_ids
	if array_length(_l1_ids, 1) > 0 then
		filtered_l1_ids = _l1_ids;
	else
		filtered_l1_ids = filters_data.l1_ids;
	end if;
	-- filters_data.l2_ids
	if array_length(_l2_ids, 1) > 0 then
		filtered_l2_ids = _l2_ids;
	else
		filtered_l2_ids = filters_data.l2_ids;
	end if;
	-- filters_data.l3_ids
	if array_length(_l3_ids, 1) > 0 then
		filtered_l3_ids = _l3_ids;
	elseif filters_data.l3_ids is not null then
		filtered_l3_ids = filters_data.l3_ids;
	end if;
	-- filters_data.l4_ids
	if array_length(_l4_ids, 1) > 0 then
		filtered_l4_ids = _l4_ids;
	elseif filters_data.l4_ids is not null then
		filtered_l4_ids = filters_data.l4_ids;
	end if;
	-- filters_data.brand_ids
	if array_length(_brand_ids, 1) > 0 then
		filtered_brand_ids = _brand_ids;
	elseif filters_data.lifecycle_indicator_ids is not null then
		filtered_brand_ids = filters_data.brand_ids;
	end if;
	-- filters_data.lifecycle_indicator_ids
	if array_length(_lifecycle_indicator, 1) > 0 then
		filtered_lifecycle_indicator_ids = _lifecycle_indicator;
	elseif filters_data.lifecycle_indicator_ids is not null then
		filtered_lifecycle_indicator_ids = filters_data.lifecycle_indicator_ids;
	end if;


	temp2_query ='select array_agg(pg_id) from global.mvw_pg_hierarchy_agg_data where %1$s ';
	-- Generate where condition to fetch the pg_ids from mvw_hierarchy_agg_data
	if array_length(_l4_ids, 1) > 0 then
		where_con2 = format(where_con2, array_to_string(filtered_l0_ids, ','),array_to_string(filtered_l1_ids, ','), array_to_string(filtered_l2_ids, ','), array_to_string(filtered_l3_ids, ','), array_to_string(filtered_l4_ids, ','));
		if array_length(_brand_ids, 1) > 0 then
			where_con2 = where_con2  || format(' and (brand_ids is null or array[%1$s] && brand_ids)', array_to_string(filtered_brand_ids, ','));
		end if;
		if array_length(_lifecycle_indicator, 1) > 0 then
			where_con2 = where_con2  || format(' and (lifecycle_indicator_ids is null or array[%1$s] && lifecycle_indicator_ids) ', array_to_string(filtered_lifecycle_indicator_ids, ','));
		end if;
	elseif array_length(_l3_ids, 1) > 0 then
		where_con2 = format(where_con2, array_to_string(filtered_l0_ids, ','),array_to_string(filtered_l1_ids, ','), array_to_string(filtered_l2_ids, ','), array_to_string(filtered_l3_ids, ','));
		if array_length(_brand_ids, 1) > 0 then
			where_con2 = where_con2  || format(' and (brand_ids is null or array[%1$s] && brand_ids)', array_to_string(filtered_brand_ids, ','));
		end if;
		if array_length(_lifecycle_indicator, 1) > 0 then
			where_con2 = where_con2  || format(' and (lifecycle_indicator_ids is null or array[%1$s] && lifecycle_indicator_ids) ', array_to_string(filtered_lifecycle_indicator_ids, ','));
		end if;
	elseif array_length(_l2_ids, 1) > 0 then
		where_con2 = format(where_con2, array_to_string(filtered_l0_ids, ','),array_to_string(filtered_l1_ids, ','), array_to_string(filtered_l2_ids, ','));
		if array_length(_brand_ids, 1) > 0 then
			where_con2 = where_con2  || format(' and (brand_ids is null or array[%1$s] && brand_ids)', array_to_string(filtered_brand_ids, ','));
		end if;
		if array_length(_lifecycle_indicator, 1) > 0 then
			where_con2 = where_con2  || format(' and (lifecycle_indicator_ids is null or array[%1$s] && lifecycle_indicator_ids) ', array_to_string(filtered_lifecycle_indicator_ids, ','));
		end if;
	elseif array_length(_l1_ids, 1) > 0 then
		where_con2 = format(where_con2, array_to_string(filtered_l0_ids, ','),array_to_string(filtered_l1_ids, ','));
		if array_length(_brand_ids, 1) > 0 then
			where_con2 = where_con2  || format(' and (brand_ids is null or array[%1$s] && brand_ids)', array_to_string(filtered_brand_ids, ','));
		end if;
		if array_length(_lifecycle_indicator, 1) > 0 then
			where_con2 = where_con2  || format(' and (lifecycle_indicator_ids is null or array[%1$s] && lifecycle_indicator_ids) ', array_to_string(filtered_lifecycle_indicator_ids, ','));
		end if;
	elseif array_length(_l0_ids, 1) > 0 then
		where_con2 = format(where_con2, array_to_string(filtered_l0_ids, ','));
		if array_length(_brand_ids, 1) > 0 then
			where_con2 = where_con2  || format(' and (brand_ids is null or array[%1$s] && brand_ids)', array_to_string(filtered_brand_ids, ','));
		end if;
		if array_length(_lifecycle_indicator, 1) > 0 then
			where_con2 = where_con2  || format(' and (lifecycle_indicator_ids is null or array[%1$s] && lifecycle_indicator_ids) ', array_to_string(filtered_lifecycle_indicator_ids, ','));
		end if;
	elseif array_length(_brand_ids, 1) > 0 and array_length(_lifecycle_indicator, 1) > 0 then
		where_con2 = where_con2  || format(' (brand_ids is null or array[%1$s] && brand_ids)', array_to_string(filtered_brand_ids, ','));
		where_con2 = where_con2  || format(' and (lifecycle_indicator_ids is null or array[%1$s] && lifecycle_indicator_ids) ', array_to_string(filtered_lifecycle_indicator_ids, ','));
	elseif array_length(_brand_ids, 1) > 0 then
		where_con2 = where_con2  || format(' (brand_ids is null or array[%1$s] && brand_ids)', array_to_string(filtered_brand_ids, ','));
	elseif array_length(_lifecycle_indicator, 1) > 0 then
		raise notice 'here';
		where_con2 = where_con2  || format(' (lifecycle_indicator_ids is null or array[%1$s] && lifecycle_indicator_ids) ', array_to_string(filtered_lifecycle_indicator_ids, ','));
	end if;
	raise notice 'where_con2: % ', where_con2;
	temp2_query = format(temp2_query, where_con2);
	raise notice 'temp2_query: % ', temp2_query;
	execute temp2_query into final_pg_ids;
	raise notice 'final_pg_ids: % ', final_pg_ids;


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
			    pg_promo_map_cte spmc using(product_group_id)', array_to_string(coalesce(final_pg_ids, array[-1]), ','), pg_types_filter);

	raise notice 'final_query : %', final_query;
	return query execute final_query;
end;
$function$
;
