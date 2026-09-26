--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_promo_final_products_11 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: removed static promo_id from code

DROP FUNCTION if exists price_promo.fn_get_promo_final_products;

CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_final_products(_promo_id integer, _is_active integer)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare
	result_arr int[];
	h_id int;
	h_data record;
	products_query text;
	hierarchy_table_name text;
	promo_product_table_name text;
	exclusion_type int;
	inclusion_type int;
	combi_union_arr text[];
	combi_union_str text;
	combi_data jsonb;
	c_data jsonb;
	where_str text;
	where_arr text[];
	exc_uploaded_products integer;
	exclusion_where_arr text[];
	hierarchy_mapping_dict json := '{"0":"l0_cid", "1":"l1_cid", "2":"l2_cid", "3":"l3_cid", "4":"l4_cid", "5":"l5_cid", "-1":"brand_cid", "-2":"lifecycle_indicator_id"}'::json;

begin
	hierarchy_table_name = format('promo_product_hierarchy', _promo_id);
	promo_product_table_name = format('promo_product_%1$s', _promo_id);

	select product_selection_type, exclusion_selection_type into inclusion_type, exclusion_type from price_promo.promo_master where promo_id = _promo_id;
	raise notice '%', CURRENT_TIMESTAMP;
	raise notice ' inc - %     exc - %', inclusion_type, exclusion_type;

	if inclusion_type = 1 then   -- sitewide inclusion
		raise notice 'sitewide inclusion';

		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';

			for h_data in select hierarchy_level_id, array_agg(hierarchy_cid) as hierarchy_cid_list from price_promo.excluded_hierarchy_combination ehc where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
			loop
				raise notice ' %   % ', h_data.hierarchy_level_id, array_to_string(h_data.hierarchy_cid_list, ',') ;
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id::text, array_to_string(h_data.hierarchy_cid_list, ','));
				raise notice '%', where_str;
				where_arr = where_arr || where_str;
			end loop;
			raise notice '%', array_to_string(where_arr, ' and ');
			where_str = array_to_string(where_arr, ' and ');

			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					is_active = %4$s
					and product_id not in (
							  select A.product_id from price_promo.product_master A, global.tb_parent_lifecycle_mapping B
							  where %2$s
							  and is_active=1
							  and A.product_id = B.product_id
	  			)', _promo_id, where_str, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;




		elsif exclusion_type = 2  then   -- copy paste
			raise notice 'copy paste exclusion';

			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and is_active =  %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;



		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';

			products_query = format('
				select array_agg(distinct product_id) as product_id_list_id
				from price_promo.tb_product_hierarchy_mapping
				where product_id not in (
						select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s)
					)
					and is_active = %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;



		elsif exclusion_type = 4 then  -- upload
			raise notice 'upload exclusion';

			combi_union_str = '';
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
					select hierarchy_cid from price_promo.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5
				', _promo_id);

			raise notice '%',  format('select count(*) from (%1$s) dd', where_str);
			execute format('select count(*) from (%1$s) dd', where_str) into exc_uploaded_products;

			if array_length(combi_union_arr, 1) > 0 then
				combi_union_str = format('hierarchy_id not in (%1$s)', array_to_string(combi_union_arr, ' union '));
			end if;

			if exc_uploaded_products > 0 and array_length(combi_union_arr, 1) > 0 then
				where_str = format('product_id not in (%1$s) or %2$s', where_str, combi_union_str);
			elsif exc_uploaded_products > 0 then
				where_str = format('product_id not in (%1$s)', where_str);
			elsif array_length(combi_union_arr, 1) > 0 then
				where_str = combi_union_str;
			else
				where_str = '';
			end if;

			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					(%2$s)
					and is_active = %4$s
			', _promo_id, where_str, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;



		else
			raise notice 'no exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where is_active = %3$s
			', _promo_id, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;


		end if;

	elsif inclusion_type = 2 then  -- hierarchy inclusion selection
		raise notice 'hierarchy inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					hierarchy_id in (select hierarchy_id from price_promo.%2$s where promo_id=%1$s)
					and is_active = %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;



		elsif exclusion_type = 2  then   -- copy paste
			raise notice 'copy paste exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select product_id from price_promo.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from price_promo.%2$s where promo_id = %1$s))
					and is_active = %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;


		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select product_id from price_promo.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from price_promo.%2$s where promo_id = %1$s))
					and is_active = %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;


		elsif exclusion_type = 4 then  -- upload
			raise notice 'upload exclusion';

			combi_union_str = '';
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
					select hierarchy_cid from price_promo.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5
				', _promo_id);

			raise notice '%',  format('select count(*) from (%1$s) dd', where_str);
			execute format('select count(*) from (%1$s) dd', where_str) into exc_uploaded_products;

			if array_length(combi_union_arr, 1) > 0 then
				combi_union_str = format('hierarchy_id not in (%1$s)', array_to_string(combi_union_arr, ' union '));
				raise notice 'in if  -  % ', where_str;
			end if;

			if exc_uploaded_products > 0 and array_length(combi_union_arr, 1) > 0 then
				where_str = format('(product_id not in (%1$s) or %2$s) and', where_str, combi_union_str);
			elsif exc_uploaded_products > 0 then
				where_str = format('product_id not in (%1$s) and ', where_str);
			elsif array_length(combi_union_arr, 1) > 0 then
				where_str = format('%1$s and', combi_union_str);
			else
				where_str = '';
			end if;

			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					%2$s
					product_id in (select product_id from price_promo.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from price_promo.%4$s where promo_id = %1$s))
					and is_active = %5$s
			', _promo_id, where_str, promo_product_table_name, hierarchy_table_name, _is_active);

			raise notice 'products query  --- %', products_query;



		else
			raise notice 'no exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id in (select product_id from price_promo.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from price_promo.%3$s where promo_id = %1$s))
					and is_active = %4$s
			', _promo_id, promo_product_table_name, hierarchy_table_name, _is_active);

			raise notice 'products query  --- %', products_query;

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
				where_str = format('%1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;


			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
					and hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %4$s)
					and is_active = %5$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, where_str, _is_active);

			raise notice 'products query  --- %', products_query;



		elsif exclusion_type = 2  then   -- copy paste
			raise notice 'copy paste exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
					and is_active = %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;



		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
					and is_active = %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;



		elsif exclusion_type = 4 then  -- upload
			raise notice 'upload exclusion';

			combi_union_str = '';
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
					select hierarchy_cid from price_promo.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5
				', _promo_id);

			raise notice '%',  format('select count(*) from (%1$s) dd', where_str);
			execute format('select count(*) from (%1$s) dd', where_str) into exc_uploaded_products;

			if array_length(combi_union_arr, 1) > 0 then
				combi_union_str = format('hierarchy_id not in (%1$s)', array_to_string(combi_union_arr, ' union '));
				raise notice 'in if  -  % ', where_str;
			end if;


			if exc_uploaded_products > 0 and array_length(combi_union_arr, 1) > 0 then
				where_str = format('(product_id not in (%1$s) or %2$s) and', where_str, combi_union_str);
			elsif exc_uploaded_products > 0 then
				where_str = format('product_id not in (%1$s) and ', where_str);
			elsif array_length(combi_union_arr, 1) > 0 then
				where_str = format('%1$s and', combi_union_str);
			else
				where_str = '';
			end if;

			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					%2$s
					product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
					and is_active = %5$s
			', _promo_id, where_str, promo_product_table_name, hierarchy_table_name, _is_active);

			raise notice 'products query  --- %', products_query;


		else
			raise notice 'no exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
					and is_active = %3$s
			', _promo_id, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;

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
				where_str = format('%1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;

			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
					and hierarchy_id not in (select hierarchy_id from price_promo.tb_product_hierarchy_lifecycle_combination where %4$s)
					and is_active = %5$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, where_str, _is_active);

			raise notice 'products query  --- %', products_query;



		elsif exclusion_type = 2  then   -- copy paste
			raise notice 'copy paste exclusion';

			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
					and is_active = %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);


		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';

			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
					and is_active = %4$s
			', _promo_id, hierarchy_table_name, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;



		elsif exclusion_type = 4 then  -- upload
			raise notice 'upload exclusion';
			combi_union_str = '';
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
					select hierarchy_cid from price_promo.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5
				', _promo_id);

			raise notice '%',  format('select count(*) from (%1$s) dd', where_str);
			execute format('select count(*) from (%1$s) dd', where_str) into exc_uploaded_products;

			if array_length(combi_union_arr, 1) > 0 then
				combi_union_str = format('hierarchy_id not in (%1$s)', array_to_string(combi_union_arr, ' union '));
				raise notice 'in if  -  % ', where_str;
			end if;


			if exc_uploaded_products > 0 and array_length(combi_union_arr, 1) > 0 then
				where_str = format('(product_id not in (%1$s) or %2$s) and', where_str, combi_union_str);
			elsif exc_uploaded_products > 0 then
				where_str = format('product_id not in (%1$s) and ', where_str);
			elsif array_length(combi_union_arr, 1) > 0 then
				where_str = format('%1$s and', combi_union_str);
			else
				where_str = '';
			end if;


			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					%2$s
					product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
					and is_active = %5$s
			', _promo_id, where_str, promo_product_table_name, hierarchy_table_name, _is_active);

			raise notice 'products query  --- %', products_query;

		else
			raise notice 'no exclusion';
			products_query = format('
				select array_agg(distinct product_id) as product_id_list
				from price_promo.tb_product_hierarchy_mapping
				where
					product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
					and is_active = %3$s
			', _promo_id, promo_product_table_name, _is_active);

			raise notice 'products query  --- %', products_query;
		end if;
	end if;

	execute products_query into result_arr;
	return result_arr;

end
$function$
;

