--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_save_promo_final_hierarchy_12 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: syntax error fix_4


DROP FUNCTION if exists price_promo.fn_save_promo_final_hierarchy;

CREATE OR REPLACE FUNCTION price_promo.fn_save_promo_final_hierarchy(_promo_id integer)
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
	hierarchy_mapping_dict json := '{"0":"l0_cid", "1":"l1_cid", "2":"l2_cid", "3":"l3_cid", "4":"l4_cid", "5":"l5_cid", "-1":"brand_cid", "-2":"lifecycle_indicator_id"}'::json;
begin
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
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from price_promo.excluded_hierarchy_combination where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;
			raise notice '%',array_to_string(exclusion_where_arr, ' and ');
			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('where hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s)', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;
			raise notice 'final where %', where_str;
			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination %1$s
				', where_str, _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 2 then   -- copy paste   (make use of promo products)
			raise notice 'copy paste exclusion';
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping where product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 3 then    --- product group  (make use of product group products)
			raise notice ' Exlusion type - Product group';
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping where product_id not in (
						select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s)
					)
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 4 then   --- upload (add for products/SVS IDs)
			raise notice ' Exlusion type - Upload';
			-- for non sku
			for combi_data in select jsonb_agg(jsonb_build_object('hierarchy_level_id', hierarchy_level_id, 'cid_value', hierarchy_cid))
				from price_promo.excluded_hierarchy_combination ehc where promo_id = _promo_id and hierarchy_level_id <> 5 group by combination_identifier
			loop
				where_arr = array[]::text[];
				raise notice 'inside looop';
				for c_data in select * from jsonb_array_elements(combi_data::jsonb)
				loop
					h_id = c_data->>'hierarchy_level_id'::text;
					where_str = format('%1$s = %2$s', hierarchy_mapping_dict->>h_id::text, c_data->>'cid_value');
					raise notice '%', where_str;
					where_arr = where_arr || where_str;
				end loop;
				raise notice '%', array_to_string(where_arr, ' and ');
				where_str = format('select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s', array_to_string(where_arr, ' and '));
				combi_union_arr = combi_union_arr || where_str;
			end loop;

			-- for svs/sku
			where_str = format('
					select hierarchy_id from price_promo.tb_product_hierarchy_mapping where product_id in (select hierarchy_cid from price_promo.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5)
				', _promo_id);
--			combi_union_arr = combi_union_arr || where_str;

			if array_length(combi_union_arr, 1) > 1 then
				sub_where_str = format('where hierarchy_id not in (%1$s)', array_to_string(combi_union_arr, ' union '));
			else
				sub_where_str = '';
			end if;
			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination %1$s
				',  sub_where_str, _promo_id, hierarchy_table_name);
			raise notice '%', select_and_insert_query;
			execute select_and_insert_query;

		else  -- no exclusion
			raise notice ' No Exclusion added';
			select_and_insert_query = format('
					insert into price_promo.%2$s (promo_id, hierarchy_id)
					select %1$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;
		end if;


	elsif inclusion_type = 2 then  -- hierarchy inclusion selection
		raise notice 'hierarchy inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from price_promo.excluded_hierarchy_combination where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			sub_where_str = format('hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s)', array_to_string(exclusion_where_arr, ' and ' ));
			exclusion_where_arr = array[]::text[];
			exclusion_where_arr = exclusion_where_arr || sub_where_str;

			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
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
				where_str = '';
			end if;
			raise notice 'final where %', where_str;
			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination %1$s
				', where_str, _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 2 then   -- copy paste   (make use of promo products)
			raise notice 'copy paste exclusion';
			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
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
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping
					where product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination %3$s)
				', _promo_id, hierarchy_table_name, where_str);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 3 then    --- product group  (make use of product group products)
			raise notice ' Exlusion type - Product group';
			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
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
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping
					where product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination %3$s)
				', _promo_id, hierarchy_table_name, where_str);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 4 then   --- upload (add for products/SVS IDs)
			raise notice ' Exlusion type - Upload';
			-- inclusion
			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;


			-- for non sku exclusion
			for combi_data in select jsonb_agg(jsonb_build_object('hierarchy_level_id', hierarchy_level_id, 'cid_value', hierarchy_cid))
				from price_promo.excluded_hierarchy_combination ehc where promo_id = _promo_id and hierarchy_level_id <> 5 group by combination_identifier
			loop
				where_arr = array[]::text[];
				raise notice 'inside looop';
				for c_data in select * from jsonb_array_elements(combi_data::jsonb)
				loop
					h_id = c_data->>'hierarchy_level_id'::text;
					where_str = format('%1$s = %2$s', hierarchy_mapping_dict->>h_id::text, c_data->>'cid_value');
					raise notice '%', where_str;
					where_arr = where_arr || where_str;
				end loop;
				raise notice '%', array_to_string(where_arr, ' and ');
				where_str = format('select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s', array_to_string(where_arr, ' and '));
				combi_union_arr = combi_union_arr || where_str;
			end loop;

			-- for svs/sku exclusion
			where_str = format('
					select hierarchy_id from price_promo.tb_product_hierarchy_mapping where product_id in (select hierarchy_cid from price_promo.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5)
				', _promo_id);
--			combi_union_arr = combi_union_arr || where_str;

			if array_length(combi_union_arr, 1) > 1 then
				sub_where_str = format('hierarchy_id not in (%1$s) and', array_to_string(combi_union_arr, ' union '));
			else
				sub_where_str = '';
			end if;

			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %4$s)
				',  sub_where_str, _promo_id, hierarchy_table_name, array_to_string(exclusion_where_arr, ' and '));
			raise notice '%', select_and_insert_query;
			execute select_and_insert_query;

		else  -- no exclusion
			raise notice ' No Exclusion added';

			exclusion_where_arr = array[]::text[];
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_value_id) as cid_list from price_promo.included_product_hierarchy where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
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
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping
					where hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination %3$s)
				', _promo_id, hierarchy_table_name, where_str);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;
		end if;

	elsif inclusion_type in (3,7) then  -- product group inclusion selection
		raise notice 'product group inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from price_promo.excluded_hierarchy_combination where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('and hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s)', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;

			raise notice 'final where %', where_str;
			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination
					where hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_mapping where product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %2$s)))
					%1$s
				', where_str, _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 2 then   -- copy paste   (make use of promo products)
			raise notice 'copy paste exclusion';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
				', _promo_id, hierarchy_table_name, where_str);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;


		elsif exclusion_type = 3 then    --- product group  (make use of product group products)
			raise notice ' Exlusion type - Product group';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping
					where product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;


		elsif exclusion_type = 4 then   --- upload (add for products/SVS IDs)
			raise notice ' Exlusion type - Upload';
			-- for non sku exclusion
			for combi_data in select jsonb_agg(jsonb_build_object('hierarchy_level_id', hierarchy_level_id, 'cid_value', hierarchy_cid))
				from price_promo.excluded_hierarchy_combination ehc where promo_id = _promo_id and hierarchy_level_id <> 5 group by combination_identifier
			loop
				where_arr = array[]::text[];
				raise notice 'inside looop';
				for c_data in select * from jsonb_array_elements(combi_data::jsonb)
				loop
					h_id = c_data->>'hierarchy_level_id'::text;
					where_str = format('%1$s = %2$s', hierarchy_mapping_dict->>h_id::text, c_data->>'cid_value');
					raise notice '%', where_str;
					where_arr = where_arr || where_str;
				end loop;
				raise notice '%', array_to_string(where_arr, ' and ');
				where_str = format('select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s', array_to_string(where_arr, ' and '));
				combi_union_arr = combi_union_arr || where_str;
			end loop;

			-- for svs/sku exclusion
			where_str = format('
					select hierarchy_id from price_promo.tb_product_hierarchy_mapping where product_id in (select hierarchy_cid from price_promo.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5)
				', _promo_id);
			combi_union_arr = combi_union_arr || where_str;

			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where hierarchy_id not in (%1$s)
					and hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_mapping where product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %2$s)))
				',  array_to_string(combi_union_arr, ' union '), _promo_id, hierarchy_table_name);
			raise notice '%', select_and_insert_query;
			execute select_and_insert_query;


		else  -- no exclusion
			raise notice ' No Exclusion added';
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping where
					product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		end if;

	elsif inclusion_type in (4,5,6) then  -- specific product inclusion selection
		raise notice 'specific product inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from price_promo.excluded_hierarchy_combination where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
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
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination
					where hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_mapping where is_active = 1 and product_id in (select product_id from price_promo.included_products where promo_id = %2$s))
					and hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s)
				', where_str, _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 2 then   -- copy paste   (make use of promo products)
			raise notice 'copy paste exclusion';
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
				', _promo_id, hierarchy_table_name, where_str);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 3 then    --- product group  (make use of product group products)
			raise notice ' Exlusion type - Product group';

			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping
					where product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		elsif exclusion_type = 4 then   --- upload (add for products/SVS IDs)
			raise notice ' Exlusion type - Upload';
			-- for non sku exclusion
			for combi_data in select jsonb_agg(jsonb_build_object('hierarchy_level_id', hierarchy_level_id, 'cid_value', hierarchy_cid))
				from price_promo.excluded_hierarchy_combination ehc where promo_id = _promo_id and hierarchy_level_id <> 5 group by combination_identifier
			loop
				where_arr = array[]::text[];
				raise notice 'inside looop';
				for c_data in select * from jsonb_array_elements(combi_data::jsonb)
				loop
					h_id = c_data->>'hierarchy_level_id'::text;
					where_str = format('%1$s = %2$s', hierarchy_mapping_dict->>h_id::text, c_data->>'cid_value');
					raise notice '%', where_str;
					where_arr = where_arr || where_str;
				end loop;
				raise notice '%', array_to_string(where_arr, ' and ');
				where_str = format('select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %1$s', array_to_string(where_arr, ' and '));
				combi_union_arr = combi_union_arr || where_str;
			end loop;

			-- for svs/sku exclusion
			where_str = format('
					select hierarchy_id from price_promo.tb_product_hierarchy_mapping where product_id in (select hierarchy_cid from price_promo.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5)
				', _promo_id);
			combi_union_arr = combi_union_arr || where_str;

			select_and_insert_query = format('
					insert into price_promo.%3$s (promo_id, hierarchy_id)
					select %2$s as promo_id, hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where hierarchy_id not in (%1$s)
					and hierarchy_id in (select hierarchy_id from price_promo.tb_product_hierarchy_mapping where product_id in (select product_id from price_promo.included_products where promo_id = %2$s))
				',  array_to_string(combi_union_arr, ' union '), _promo_id, hierarchy_table_name);
			raise notice '%', select_and_insert_query;
			execute select_and_insert_query;


		else  -- no exclusion
			raise notice ' No Exclusion added';
			select_and_insert_query = format('
					insert into price_promo.%2$s (hierarchy_id, promo_id)
					select distinct hierarchy_id, %1$s as promo_id from price_promo.tb_product_hierarchy_mapping
					where product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
				', _promo_id, hierarchy_table_name);
			raise notice '%',select_and_insert_query;
			execute select_and_insert_query;

		end if;
	end if;
end
$function$
;

