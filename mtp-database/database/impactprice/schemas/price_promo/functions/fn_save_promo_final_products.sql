--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_save_promo_final_products_20 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: issue fix for promo count update and user_metadata retention

DROP FUNCTION if exists price_promo.fn_save_promo_final_products;

CREATE OR REPLACE FUNCTION price_promo.fn_save_promo_final_products(_promo_id integer, _user_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
	combi_union_str text;
	combi_data jsonb;
	c_data jsonb;
	where_str text;
	where_arr text[];
	exc_uploaded_products integer;
	exclusion_where_arr text[];
	_product_hierarchies_config jsonb;
	hierarchy_mapping_dict json;

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
	
	hierarchy_table_name = format('promo_product_hierarchy', _promo_id);
	promo_product_table_name = format('promo_product_%1$s', _promo_id);

    execute format('CREATE TABLE if not exists price_promo.%1$s PARTITION OF price_promo.promo_product FOR VALUES IN (%2$s);', promo_product_table_name, _promo_id);
	
	-- Store existing user_metadata in a temporary table before deleting
	execute format('CREATE TEMP TABLE temp_user_metadata AS 
		SELECT product_id, user_metadata 
		FROM price_promo.%1$s 
		WHERE user_metadata IS NOT NULL AND user_metadata != ''{}''::jsonb', promo_product_table_name);
	
	execute format('delete from price_promo.%1$s', promo_product_table_name);

	select product_selection_type, exclusion_selection_type into inclusion_type, exclusion_type from price_promo.promo_master where promo_id = _promo_id;
	raise notice '%', CURRENT_TIMESTAMP;
	raise notice ' inc - %     exc - %', inclusion_type, exclusion_type;

	if inclusion_type = 1 then   -- sitewide inclusion
		raise notice 'sitewide inclusion';

		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';

			for h_data in select hierarchy_level_id, array_agg(hierarchy_cid) as hierarchy_cid_list from price_promo.excluded_hierarchy_combination ehc where promo_id = _promo_id  group by hierarchy_level_id
			loop
				raise notice ' %   % ', h_data.hierarchy_level_id, array_to_string(h_data.hierarchy_cid_list, ',') ;
				where_str = format('%1$s in (%2$s)', hierarchy_mapping_dict->>h_data.hierarchy_level_id::text, array_to_string(h_data.hierarchy_cid_list, ','));
				raise notice '%', where_str;
				where_arr = where_arr || where_str;
			end loop;
			raise notice '%', array_to_string(where_arr, ' and ');
			where_str = array_to_string(where_arr, ' and ');

			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.product_master
				where
					is_active = 1
					and product_id not in (
							  select A.product_id from price_promo.product_master A
							  where %2$s
							  and is_active=1
	  			)', _promo_id, where_str, promo_product_table_name );

			raise notice 'products query  --- %', products_query;
			execute products_query;



		elsif exclusion_type in (2,4)  then   -- copy paste or upload excel
			raise notice 'copy paste exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.product_master
				where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and is_active = 1
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.product_master
				where product_id not in (
						select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s)
					)
					and is_active = 1
			', _promo_id, hierarchy_table_name, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;


		else
			raise notice 'no exclusion';
			products_query = format('
				insert into price_promo.%2$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.product_master
				where is_active = 1
			', _promo_id, promo_product_table_name);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		end if;

	elsif inclusion_type = 2 then  -- hierarchy inclusion selection
		raise notice 'hierarchy inclusion';
		if exclusion_type = 1  then   -- hierarchy exclusion
			raise notice 'hierarchy exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%4$s)
				where
					hierarchy_id in (select hierarchy_id from price_promo.%2$s where promo_id=%1$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type in (2,4)  then   -- copy paste or upload excel
			raise notice 'copy paste exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%4$s)
				where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select product_id from price_promo.fn_get_user_restricted_products(%4$s) where hierarchy_id in (select hierarchy_id from price_promo.%2$s where promo_id = %1$s))
			', _promo_id, hierarchy_table_name, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%4$s)
				where
					product_id not in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select product_id from price_promo.fn_get_user_restricted_products(%4$s) where hierarchy_id in (select hierarchy_id from price_promo.%2$s where promo_id = %1$s))
			', _promo_id, hierarchy_table_name, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;


		else
			raise notice 'no exclusion';
			products_query = format('
				insert into price_promo.%2$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%4$s)
				where
					product_id in (
                        select product_id 
                        from price_promo.fn_get_user_restricted_products(%4$s) 
                        where hierarchy_id in (select hierarchy_id from price_promo.%3$s where promo_id = %1$s)
                    )
			', _promo_id, promo_product_table_name, hierarchy_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;
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
				where_str = format('%1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;


			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%5$s,array[0,1])
				where
					product_id in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
					and hierarchy_id not in (select distinct hierarchy_id from price_promo.product_master where %4$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name, where_str, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type in (2,4)  then   -- copy paste or upload excel
			raise notice 'copy paste exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%4$s,array[0,1])
				where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
			', _promo_id, hierarchy_table_name, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%4$s,array[0,1])
				where
					product_id not in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
			', _promo_id, hierarchy_table_name, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		else
			raise notice 'no exclusion';
			products_query = format('
				insert into price_promo.%2$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%3$s,array[0,1])
				where
					product_id in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_promo_product_groups epg where promo_id = %1$s))
			', _promo_id, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;
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
				where_str = format('%1$s', array_to_string(exclusion_where_arr, ' and '));
			else
				where_str = '';
			end if;

			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%5$s,array[0,1])
				where
					product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
					and hierarchy_id not in (select distinct hierarchy_id from price_promo.product_master where %4$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name, where_str, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type in (2,4)  then   -- copy paste or upload excel
			raise notice 'copy paste exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%4$s,array[0,1])
				where
					product_id not in (select product_cid from price_promo.excluded_products ep where promo_id = %1$s)
					and product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif exclusion_type = 3 then  -- product group
			raise notice 'product group exclusion';
			products_query = format('
				insert into price_promo.%3$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%4$s,array[0,1])
				where
					product_id not in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = %1$s))
					and product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
			', _promo_id, hierarchy_table_name, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;


		else
			raise notice 'no exclusion';
			products_query = format('
				insert into price_promo.%2$s (product_id, promo_id)
				select distinct product_id, %1$s as promo_id
				from price_promo.fn_get_user_restricted_products(%3$s,array[0,1])
				where
					product_id in (select product_id from price_promo.included_products where promo_id = %1$s)
			', _promo_id, promo_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;
		end if;

	end if;

	WITH products_count_cte AS (
	    SELECT 
	        COUNT(*) AS products_count,
	        COUNT(pm.*) FILTER (WHERE pm.kvi_indicator = 1) AS kvi_tagged_products_count,
	        promo_id
	    FROM price_promo.promo_product pp
	    LEFT JOIN price_promo.product_master pm ON pp.product_id = pm.product_id
	    WHERE pp.promo_id = _promo_id
	    GROUP BY promo_id
	)
	UPDATE price_promo.promo_master pm
	SET 
	    products_count = COALESCE(pcc.products_count, 0),
	    kvi_tagged_products_count = COALESCE(pcc.kvi_tagged_products_count, 0)
	FROM products_count_cte pcc
	WHERE pm.promo_id = _promo_id;
	
	RAISE NOTICE 'Restoring user_metadata from temporary table';
	
	-- Restore user_metadata from temporary table
	execute format('UPDATE price_promo.%1$s 
		SET user_metadata = temp_user_metadata.user_metadata 
		FROM temp_user_metadata 
		WHERE price_promo.%1$s.product_id = temp_user_metadata.product_id', promo_product_table_name);
	
	-- Drop the temporary table
	DROP TABLE IF EXISTS temp_user_metadata;
end
$function$
;
