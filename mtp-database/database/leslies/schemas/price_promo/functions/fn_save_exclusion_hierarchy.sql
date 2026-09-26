--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_save_exclusion_hierarchy_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: issue fixes 6

DROP FUNCTION if exists price_promo.fn_save_exclusion_hierarchy;
CREATE OR REPLACE FUNCTION price_promo.fn_save_exclusion_hierarchy(_promo_id integer, _exclusion_type integer, _json_data json DEFAULT '{}'::json, _arr_data bigint[] DEFAULT ARRAY[]::bigint[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	h_level text;
	h_value jsonb;
	h_val int;
	_data json;
	cuq text;
	combination_counter int := 1;
	insert_values_str_arr text[];
	_product_hierarchies_config jsonb;
	level_cid_mapping_dict json;
	cuq_column_mapping_dict json;
begin
	select config_value::jsonb into _product_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'product' and config_name = 'hierarchy_filters';
	
	level_cid_mapping_dict = (
		select jsonb_object_agg(
			value->>'id_column', value->>'id'
		)::json
		from jsonb_each(_product_hierarchies_config)
		where (value->>'id')::INTEGER IS NOT NULL
	);

	cuq_column_mapping_dict = (
		select jsonb_object_agg(
			value->>'id_column', value->>'value_column'
		)::json
		from jsonb_each(_product_hierarchies_config)
		where (value->>'id')::INTEGER IS NOT NULL
	);

	if _exclusion_type = 1 then
		-- hierarchy selection
		raise notice ' hierarchy selection';
		for h_level, h_value in SELECT key, value FROM json_each(_json_data)
		loop
			raise notice 'h_level --- %', h_level;
			if jsonb_typeof(h_value) = 'array' and jsonb_array_length(h_value) > 0 then
				FOR h_val IN SELECT * FROM jsonb_array_elements(h_value) loop
					if h_level <> 'lifecycle_indicator_id' then
						raise notice ' values ----  % -- % -- %', cuq_column_mapping_dict->>h_level::text, h_level, h_val;
						query = format('select distinct %1$s from price_promo.tb_product_hierarchy_lifecycle_combination where %2$s = %3$s', cuq_column_mapping_dict->>h_level::text, h_level, h_val);
						raise notice 'query - %', query;
						execute query into cuq;
						raise notice ' cuq --> %', cuq;
					else
						query = format('select distinct lifecycle_indicator from global.tb_lifecycle_indicator_config tlic where id = %1$s', h_val);
   						raise notice 'query - %', query;
						execute query into cuq;
						raise notice ' cuq --> %', cuq;

					end if;
					insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %5$L, %4$s)', _promo_id, level_cid_mapping_dict->>h_level, h_val, combination_counter, cuq));
				end loop;
			end if;

	    end loop;

		query := format('
				DELETE FROM price_promo.excluded_hierarchy_combination where promo_id = %1$s;
	            INSERT INTO price_promo.excluded_hierarchy_combination
	            	(promo_id, hierarchy_level_id, hierarchy_cid, hierarchy_cuq, combination_identifier)
	            VALUES
					%2$s;
				', _promo_id, array_to_string(insert_values_str_arr, ', '));
		raise notice 'ins hierarchy query -------- %', query;
		execute query;

	elsif _exclusion_type in (2,4) then
		-- copy paste
		raise notice ' copy paste';
		query := format('
				DELETE FROM price_promo.excluded_products where promo_id = %1$s;
				INSERT INTO price_promo.excluded_products
					(promo_id, product_id, product_cid, product_name)
				select
					%1$s as promo_id,
					product_id as product_id,
					product_id as product_cid,
					product_name
				from
					price_promo.product_master pm
				where
					product_id in (%2$s)', _promo_id, array_to_string(_arr_data, ', '));
		raise notice ' ins copy paste query --  %', query;
		execute query;

	elsif _exclusion_type = 3 then
		-- product group
		raise notice ' product group';
		query := format('
				DELETE FROM price_promo.excluded_product_groups where promo_id = %1$s;
				INSERT INTO price_promo.excluded_product_groups
					(promo_id, pg_id, pg_name)
				select
					%1$s as promo_id,
					pg_id,
					pg_name
				from
					global.tb_product_group
				where
					pg_id in (%2$s)', _promo_id, array_to_string(_arr_data, ', '));
		raise notice ' ins product group query --  %', query;
		execute query;

	end if;
end
$function$
;