--liquibase formatted sql
--changeset liquibase:fn_save_promo_final_products runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_save_promo_final_products
--rollback: SELECT 1

DROP FUNCTION if exists base_pricing.fn_save_promo_final_products();
CREATE OR REPLACE FUNCTION base_pricing.fn_save_promo_final_products(_promo_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	h_id int;
	h_data record;
	products_query text;
	hierarchy_table_name text;
	promo_product_table_name text;
	exclusion_type int;
	inclusion_type int;
	combi_union_arr text[];
	combi_data jsonb;
	c_data jsonb;
	where_str text;
	where_arr text[];
	exclusion_where_arr text[];
	hierarchy_mapping_dict json := '{"0":"l0_cid", "1":"l1_cid", "2":"l2_cid", "3":"l3_cid", "4":"l4_cid", "5":"l5_cid", "-1":"brand_cid", "-2":"lifecycle_indicator_id"}'::json;

begin
	-- hierarchy_table_name = format('promo_product_hierarchy_new_flow_%1$s', _promo_id);
	hierarchy_table_name = 'promo_product_hierarchy';
	promo_product_table_name = format('promo_product_%1$s', _promo_id);

	execute format('delete from base_pricing.%1$s', promo_product_table_name);
	execute format('CREATE TABLE if not exists base_pricing.promo_product_new_flow_%1$s PARTITION OF base_pricing.promo_product_new_flow FOR VALUES IN (%1$s)', _promo_id);


	select product_selection_type, exclusion_selection_type into inclusion_type, exclusion_type from base_pricing.promo_master where promo_id = _promo_id;
	raise notice '%', CURRENT_TIMESTAMP;
	raise notice ' inc - %     exc - %', inclusion_type, exclusion_type;

	if inclusion_type = 1 then   -- sitewide inclusion
		raise notice 'sitewide inclusion';

		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from base_pricing.%2$s where promo_id=%1$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 2  then   -- copy paste
			raise notice 'copy paste exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where product_id not in (select product_cid from base_pricing.excluded_products ep where promo_id = %1$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where product_id not in (
						select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.excluded_product_groups epg where promo_id = %1$s)
					)
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 4 then  -- upload
			raise notice 'upload exclusion';
			-- for non sku
			for combi_data in select jsonb_agg(jsonb_build_object('hierarchy_level_id', hierarchy_level_id, 'cid_value', hierarchy_cid))
				from base_pricing.excluded_hierarchy_combination ehc where promo_id = _promo_id and hierarchy_level_id <> 5 group by combination_identifier
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
				where_str = format('select hierarchy_id from base_pricing.tb_product_hierarchy_lifecycle_combination where %1$s', array_to_string(where_arr, ' and '));
				combi_union_arr = combi_union_arr || where_str;
			end loop;

			-- for svs/sku
			where_str = format('
					select hierarchy_cid from base_pricing.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5
				', _promo_id);

			products_query = format('
				insert into base_pricing.%4$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where product_id not in (%2$s)
				or hierarchy_id not in (%3$s);
			', _promo_id, where_str, array_to_string(combi_union_arr, ' union '), promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		else
			raise notice 'no exclusion';
			products_query = format('
				insert into base_pricing.%2$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping
			', _promo_id, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		end if;

	elsif inclusion_type = 2 then  -- hierarchy inclusion selection
		raise notice 'hierarchy inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from base_pricing.%2$s where promo_id=%1$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 2  then   -- copy paste
			raise notice 'copy paste exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (select product_cid from base_pricing.excluded_products ep where promo_id = %1$s)
				and product_id in (select product_id from base_pricing.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from base_pricing.%2$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.excluded_product_groups epg where promo_id = %1$s))
				and product_id in (select product_id from base_pricing.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from base_pricing.%2$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 4 then  -- upload
			raise notice 'upload exclusion';
			-- for svs/sku
			where_str = format('
					select hierarchy_cid from base_pricing.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5
				', _promo_id);

			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (%2$s)
				and product_id in (select product_id from base_pricing.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from base_pricing.%2$s)
			', _promo_id, where_str, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		else
			raise notice 'no exclusion';
			products_query = format('
				insert into base_pricing.%2$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping
				where product_id in (select product_id from base_pricing.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from base_pricing.%2$s)
			', _promo_id, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;
		end if;

	elsif inclusion_type in (3,7) then  -- product group inclusion selection
		raise notice 'product group inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from base_pricing.excluded_hierarchy_combination where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s not in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('%1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;


			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.included_promo_product_groups epg where promo_id = %1$s))
				and hierarchy_id not in (select hierarchy_id from base_pricing.tb_product_hierarchy_lifecycle_combination where %4$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name, where_str);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 2  then   -- copy paste
			raise notice 'copy paste exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (select product_cid from base_pricing.excluded_products ep where promo_id = %1$s)
				and product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.included_promo_product_groups epg where promo_id = %1$s))
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.excluded_product_groups epg where promo_id = %1$s))
				and product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.included_promo_product_groups epg where promo_id = %1$s))
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 4 then  -- upload
			raise notice 'upload exclusion';
			-- for svs/sku
			where_str = format('
					select hierarchy_cid from base_pricing.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5
				', _promo_id);

			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (%2$s)
				and product_id in (select product_id from base_pricing.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from base_pricing.%2$s)
				and product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.included_promo_product_groups epg where promo_id = %1$s))
			', _promo_id, where_str, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		else
			raise notice 'no exclusion';
			products_query = format('
				insert into base_pricing.%2$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping
				where product_id in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.included_promo_product_groups epg where promo_id = %1$s))
			', _promo_id, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;
		end if;

	elsif inclusion_type in (4,5,6) then  -- specific product inclusion selection
		raise notice 'specific product inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';

			for h_data in select hierarchy_level_id::text, array_agg(hierarchy_cid) as cid_list from base_pricing.excluded_hierarchy_combination where promo_id = _promo_id and hierarchy_level_id <> 5 group by hierarchy_level_id
			loop
				raise notice 'level  %   --  key  % --  ids  %', h_data.hierarchy_level_id, hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ',');
				where_str = format('%1$s not in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id, array_to_string(h_data.cid_list, ','));
				raise notice 'where str   -  %', where_str;
				exclusion_where_arr = exclusion_where_arr || where_str;
			end loop;

			if array_length(exclusion_where_arr, 1) > 0 then
				where_str = format('%1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;


			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id in (select product_id from base_pricing.included_products where promo_id = %1$s)
				and hierarchy_id not in (select hierarchy_id from base_pricing.tb_product_hierarchy_lifecycle_combination where %4$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name, where_str);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 2  then   -- copy paste
			raise notice 'copy paste exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (select product_cid from base_pricing.excluded_products ep where promo_id = %1$s)
				and product_id in (select product_id from base_pricing.included_products where promo_id = %1$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (select distinct product_id from global.tb_pg_product tpp where pg_id in (select pg_id from base_pricing.excluded_product_groups epg where promo_id = %1$s))
				and product_id in (select product_id from base_pricing.included_products where promo_id = %1$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 4 then  -- upload
			raise notice 'upload exclusion';
			-- for svs/sku
			where_str = format('
					select hierarchy_cid from base_pricing.excluded_hierarchy_combination ehc where promo_id = %1$s and hierarchy_level_id = 5
				', _promo_id);

			products_query = format('
				insert into base_pricing.%3$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping where
				product_id not in (%2$s)
				and product_id in (select product_id from base_pricing.tb_product_hierarchy_mapping where hierarchy_id in (select hierarchy_id from base_pricing.%2$s)
				and product_id in (select product_id from base_pricing.included_products where promo_id = %1$s)
			', _promo_id, where_str, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		else
			raise notice 'no exclusion';
			products_query = format('
				insert into base_pricing.%2$s (product_id, product_name, promo_id)
				select distinct product_id, l5_name as product_name, %1$s as promo_id
				from base_pricing.tb_product_hierarchy_mapping
				where product_id in (select product_id from base_pricing.included_products where promo_id = %1$s)
			', _promo_id, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;
		end if;

	end if;
end
$function$
;
