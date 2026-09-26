--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_save_event_final_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_save_event_final_hierarchy

DROP FUNCTION if exists price_promo.fn_save_event_final_hierarchy;
CREATE OR REPLACE FUNCTION price_promo.fn_save_event_final_hierarchy(_event_id integer, _user_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	hierarchy_table_name text;
	exclusion_type text;
	inclusion_type text;
	select_and_insert_query text;
	exclusion_where_arr text[];
	h_data record;
	hierarchy_mapping_dict json;
	_product_hierarchies_config jsonb;
	where_str text;
begin
	select config_value::jsonb into _product_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'product' and config_name = 'hierarchy_filters';

	hierarchy_mapping_dict = (
		select jsonb_object_agg(
			value->>'id', value->>'id_column'
		)::json
		from jsonb_each(_product_hierarchies_config)
		where (value->>'id')::INTEGER IS NOT NULL
	);
	
	hierarchy_table_name = 'event_product_hierarchy';

	raise notice '%', format('delete from price_promo.%1$s where event_id=%2$s', hierarchy_table_name, _event_id);
	execute format('delete from price_promo.%1$s where event_id=%2$s', hierarchy_table_name, _event_id);

	select product_inclusion_type, product_exclusion_type into inclusion_type, exclusion_type from price_promo.event_master where event_id = _event_id;
	raise notice '%', CURRENT_TIMESTAMP;
	raise notice ' inc - %     exc - %', inclusion_type, exclusion_type;
	
	if exclusion_type = 'product_group' then 
		raise notice 'product_group exclusion';

		if inclusion_type is null or inclusion_type = 'sitewide' or inclusion_type = '' then 
			raise notice 'sitewide inclusion';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from price_promo.fn_get_user_restricted_products(%3$L) where product_id not in (
						select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.excluded_event_product_groups epg where event_id = %1$s)
					)
                    and is_active = 1
				', _event_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif inclusion_type = 'whole_category'  then 
			raise notice 'whole_category inclusion';

			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_event_product_hierarchy where event_id = _event_id group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('where %1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from price_promo.fn_get_user_restricted_products(%4$L) where product_id not in (
						select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.excluded_event_product_groups epg where event_id = %1$s)
					) and hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_combination %3$s)
				', _event_id, hierarchy_table_name, where_str, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif inclusion_type = 'product_group'  then 
			raise notice 'product_group inclusion';

		raise notice ' Exlusion type - Product group';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from price_promo.fn_get_user_restricted_products(%3$L)
					where product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.excluded_event_product_groups epg where event_id = %1$s))
					and product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_event_product_groups epg where event_id = %1$s))
				', _event_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif inclusion_type = 'specific_products'  then 
			raise notice 'specific_products inclusion';
	
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from price_promo.fn_get_user_restricted_products(%3$L)
					where product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.excluded_event_product_groups epg where event_id = %1$s))
					and product_id in (select product_id from price_promo.included_event_products where event_id = %1$s)
				', _event_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		end if;

	else
		raise notice 'no exclusion';

		if inclusion_type is null or inclusion_type = 'sitewide' or inclusion_type = '' then 
			raise notice 'sitewide inclusion';

			select_and_insert_query = format('
					insert into price_promo.%2$s (event_id, hierarchy_id)
					select distinct %1$s as event_id, hierarchy_id from price_promo.fn_get_user_restricted_products(%3$L)
                    where is_active = 1
				', _event_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif inclusion_type = 'whole_category'  then 
			raise notice 'whole_category inclusion';

			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_event_product_hierarchy where event_id = _event_id group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('where %1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from price_promo.fn_get_user_restricted_products(%4$L)
					where hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_combination %3$s)
				', _event_id, hierarchy_table_name, where_str, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif inclusion_type = 'product_group'  then 
			raise notice 'product_group inclusion';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from price_promo.fn_get_user_restricted_products(%3$L)
					where product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_event_product_groups epg where event_id = %1$s))
				', _event_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif inclusion_type = 'specific_products'  then 
			raise notice 'specific_products inclusion';
	
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, event_id)
					select distinct hierarchy_id, %1$s as event_id from price_promo.fn_get_user_restricted_products(%3$L)
					where product_id in (select product_id from price_promo.included_event_products where event_id = %1$s)
				', _event_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		end if;

	end if;
end
$function$
;
