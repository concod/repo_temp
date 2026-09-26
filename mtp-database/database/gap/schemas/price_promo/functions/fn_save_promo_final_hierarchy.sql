--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_save_promo_final_hierarchy_12 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: syntax error fix_4


DROP FUNCTION if exists price_promo.fn_save_promo_final_hierarchy;

CREATE OR REPLACE FUNCTION price_promo.fn_save_promo_final_hierarchy(_promo_id integer, _user_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
	h_id int;
	combi_union_arr text[];
	hierarchy_table_name text;
	select_and_insert_query text;
	h_data record;
	combi_data jsonb;
	c_data jsonb;
	exclusion_type int;
	inclusion_type int;
	exclusion_where_arr text[];
	where_str text;
	where_arr text[];
	sub_where_str text;
	_product_hierarchies_config jsonb;
	hierarchy_mapping_dict json;
    _event_id int;
begin

	select config_value::jsonb into _product_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'product' and config_name = 'hierarchy_filters';

    select event_id into _event_id
    from price_promo.promo_master
    where promo_id = _promo_id;

	hierarchy_mapping_dict = (
		select jsonb_object_agg(
			value->>'id', value->>'id_column'
		)::json
		from jsonb_each(_product_hierarchies_config)
		where (value->>'id')::INTEGER IS NOT NULL
	);

--	hierarchy_table_name = format('promo_product_hierarchy_%1$s', _promo_id);
	hierarchy_table_name = 'promo_product_hierarchy';

	raise notice '%', format('delete from price_promo.%1$s where promo_id=%2$s', hierarchy_table_name, _promo_id);
	execute format('delete from price_promo.%1$s where promo_id=%2$s', hierarchy_table_name, _promo_id);

	select product_selection_type, exclusion_selection_type into inclusion_type, exclusion_type from price_promo.promo_master where promo_id = _promo_id;
	raise notice '%', CURRENT_TIMESTAMP;
	raise notice ' inc - %     exc - %', inclusion_type, exclusion_type;

	if inclusion_type = 1 then   -- sitewide inclusion
		raise notice 'sitewide inclusion';

		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from price_promo.excluded_hierarchy_combination where promo_id = _promo_id  group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;
			raise notice '%',array_to_string(exclusion_where_arr, ' and ');
			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('and hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_combination where %1$s)', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;
			raise notice 'final where %', where_str;
			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select distinct %2$s as promo_id, hierarchy_id from price_promo.product_master 
                    where is_active = 1 %1$s
				', where_str, _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type in (2,4) then   -- copy paste or upload excel   (make use of promo products)
			raise notice 'copy paste exclusion';
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id 
                    from price_promo.product_master 
                    where product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
                    and is_active = 1
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 3 then    --- product group  (make use of product group products)
			raise notice ' Exlusion type - Product group';
			select_and_insert_query = format('
                insert into price_promo.%2$s (hierarchy_id, promo_id)
                select distinct hierarchy_id, %1$s as promo_id 
                from price_promo.product_master 
                where product_id not in (
                    select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s)
                )
                and is_active = 1
                ',
                _promo_id,
                hierarchy_table_name
            );
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;


		else  -- no exclusion
			raise notice ' No Exclusion added';
			select_and_insert_query = format('
					insert into price_promo.%2$s (promo_id, hierarchy_id)
					select distinct %1$s as promo_id, hierarchy_id from price_promo.product_master
                    where is_active = 1
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;
		end if;


	elsif inclusion_type = 2 then  -- hierarchy inclusion selection
		raise notice 'hierarchy inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from price_promo.excluded_hierarchy_combination where promo_id = _promo_id  group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			sub_where_str = format('hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_combination where %1$s)', array_to_string(exclusion_where_arr, ' and ' ));
			exclusion_where_arr = array[]::text[];
			exclusion_where_arr = exclusion_where_arr || sub_where_str;

			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id  group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			raise notice '%',array_to_string(exclusion_where_arr, ' and ');
			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('where %1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = 'where true';
			end if;
			raise notice 'final where %', where_str;
			select_and_insert_query = format('
                insert into price_promo.%3$s (promo_id, hierarchy_id)
                select distinct %2$s as promo_id, hierarchy_id from price_promo.fn_get_user_restricted_products(%5$s)
                %1$s
                and hierarchy_id in (
                    select hierarchy_id from price_promo.event_product_hierarchy where event_id = %4$s
                )
            ', where_str, _promo_id, hierarchy_table_name,_event_id,_user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type in (2,4) then   -- copy paste or upload excel   (make use of promo products)
			raise notice 'copy paste exclusion';
			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id  group by hierarchy_level_id
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
                insert into price_promo.%2$s (hierarchy_id, promo_id)
                select distinct hierarchy_id, %1$s as promo_id from price_promo.fn_get_user_restricted_products(%5$s)
                where product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
                and hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_combination %3$s)
                and hierarchy_id in (
                    select hierarchy_id from price_promo.event_product_hierarchy where event_id = %4$s
                ) ',
                _promo_id,
                hierarchy_table_name,
                where_str,
                _event_id,
				_user_id
            );
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 3 then    --- product group  (make use of product group products)
			raise notice ' Exlusion type - Product group';
			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id  group by hierarchy_level_id
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
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.fn_get_user_restricted_products(%5$s)
					where product_id not in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_combination %3$s)
                    and hierarchy_id in (
                        select hierarchy_id from price_promo.event_product_hierarchy where event_id = %4$s
                    )
				', _promo_id, hierarchy_table_name, where_str,_event_id,_user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		else  -- no exclusion
			raise notice ' No Exclusion added';

			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id  group by hierarchy_level_id
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
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.fn_get_user_restricted_products(%5$s)
					where 
                        hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_combination %3$s)
                        and hierarchy_id in (
                            select hierarchy_id from price_promo.event_product_hierarchy where event_id = %4$s
                        )
				', _promo_id, hierarchy_table_name, where_str,_event_id, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;
		end if;

	elsif inclusion_type in (3,7) then  -- product group inclusion selection
		raise notice 'product group inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from price_promo.excluded_hierarchy_combination where promo_id = _promo_id  group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('and hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_combination where %1$s)', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;

			raise notice 'final where %', where_str;
			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_combination
					where hierarchy_id in (
                        select distinct hierarchy_id from price_promo.fn_get_user_restricted_products(%4$s,array[0,1]) 
                        where product_id in (
                            select distinct product_id 
                            from pricesmart.tb_pg_product tpp 
                            where pg_id in (
                                select product_group_id 
                                from price_promo.included_promo_product_groups epg 
                                where promo_id = %2$s
                            )
                        )
                    )
					%1$s
				', where_str, _promo_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type in (2,4) then   -- copy paste or upload excel  (make use of promo products)
			raise notice 'copy paste exclusion';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.fn_get_user_restricted_products(%4$s,array[0,1]) 
                    where product_id not in (
                        select product_cid from price_promo.excluded_products ep where promo_id = %1$s
                    )
					and product_id in (
                        select distinct product_id 
                        from pricesmart.tb_pg_product tpp 
                        where pg_id in (
                            select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s
                        )
                    )
				', _promo_id, hierarchy_table_name, where_str, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;


		elsif exclusion_type = 3 then    --- product group  (make use of product group products)
			raise notice ' Exlusion type - Product group';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id 
                    from price_promo.fn_get_user_restricted_products(%3$s,array[0,1])
					where product_id not in (
                        select distinct product_id 
                        from pricesmart.tb_pg_product tpp 
                        where pg_id in (
                            select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s
                        )
                    )
					and product_id in (
                        select distinct product_id 
                        from pricesmart.tb_pg_product tpp 
                        where pg_id in (
                            select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s
                        )
                    )
				', _promo_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;


		else  -- no exclusion
			raise notice ' No Exclusion added';
			select_and_insert_query = format('
                insert into price_promo.%2$s (hierarchy_id, promo_id)
                select distinct hierarchy_id, %1$s as promo_id 
                from price_promo.fn_get_user_restricted_products(%3$s,array[0,1]) 
                where product_id in (
                    select distinct product_id 
                    from pricesmart.tb_pg_product tpp 
                    where pg_id in (
                        select product_group_id 
                        from price_promo.included_promo_product_groups epg 
                        where promo_id = %1$s
                    )
                )
                ',
                _promo_id,
                hierarchy_table_name,
                _user_id
            );
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		end if;

	elsif inclusion_type in (4,5,6) then  -- specific product inclusion selection
		raise notice 'specific product inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from price_promo.excluded_hierarchy_combination where promo_id = _promo_id  group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format(' %1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;

			raise notice 'final where %', where_str;
			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_combination
					where hierarchy_id in (
                        select hierarchy_id from price_promo.fn_get_user_restricted_products(%4$s,array[0,1]) 
                        where product_id in (
                            select product_id from price_promo.included_products where promo_id = %2$s
                        )
                    )
					and hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_combination where %1$s)
				', where_str, _promo_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type in (2,4) then   -- copy paste or upload excel   (make use of promo products)
			raise notice 'copy paste exclusion';
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.fn_get_user_restricted_products(%4$s,array[0,1]) where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
				', _promo_id, hierarchy_table_name, where_str, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 3 then    --- product group  (make use of product group products)
			raise notice ' Exlusion type - Product group';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.fn_get_user_restricted_products(%3$s,array[0,1])
					where product_id not in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
				', _promo_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;


		else  -- no exclusion
			raise notice ' No Exclusion added';
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.fn_get_user_restricted_products(%3$s,array[0,1])
					where product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
				', _promo_id, hierarchy_table_name, _user_id);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		end if;
	end if;
end
$function$
;

