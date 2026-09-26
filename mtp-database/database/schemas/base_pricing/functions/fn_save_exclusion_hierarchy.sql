--liquibase formatted sql
--changeset liquibase:fn_save_exclusion_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_save_exclusion_hierarchy
--rollback: SELECT 1

DROP FUNCTION if exists base_pricing.fn_save_exclusion_hierarchy();
CREATE OR REPLACE FUNCTION base_pricing.fn_save_exclusion_hierarchy(_promo_id integer, _exclusion_type integer, _json_data json DEFAULT '{}'::json, _arr_data bigint[] DEFAULT ARRAY[]::bigint[])
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
	level_cid_mapping_dict json := '{"l0_cid": 0, "l1_cid": 1, "l2_cid": 2, "l3_cid": 3, "l4_cid": 4, "l5_cid": 5, "lifecycle_indicator_id": -2, "brand_id": -1}'::json;
	level_id_mapping_dict json := '{"l0_id": 0, "l1_id": 1, "l2_id": 2, "l3_id": 3, "l4_id": 4, "l5_id": 5, "lifecycle_indicator_id": -2, "brand_id": -1}'::json;
	cuq_column_mapping_dict json := '{"l0_cid": "l0_cuq", "l1_cid": "l1_cuq", "l2_cid": "l2_cuq", "l3_cid": "l3_cuq", "l4_cid": "l4_cuq", "l5_cid": "l5_cuq", "lifecycle_indicator_id": "lifecycle_indicator", "brand_id": "mfg_name"}'::json;
begin
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
						query = format('select distinct %1$s from base_pricing.tb_product_hierarchy_lifecycle_combination where %2$s = %3$s', cuq_column_mapping_dict->>h_level::text, h_level, h_val);
						raise notice 'query - %', query;
						execute query into cuq;
						raise notice ' cuq --> %', cuq;
					end if;
					insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %5$L, %4$s)', _promo_id, level_cid_mapping_dict->h_level, h_val, combination_counter, cuq));
				end loop;
			end if;

	    end loop;

		query := format('
				DELETE FROM base_pricing.excluded_hierarchy_combination where promo_id = %1$s;
	            INSERT INTO base_pricing.excluded_hierarchy_combination
	            	(promo_id, hierarchy_level_id, hierarchy_cid, hierarchy_cuq, combination_identifier)
	            VALUES
					%2$s;
				', _promo_id, array_to_string(insert_values_str_arr, ', '));
		raise notice 'ins hierarchy query -------- %', query;
		execute query;

	elsif _exclusion_type = 2 then
		-- copy paste
		raise notice ' copy paste';
		query := format('
				DELETE FROM base_pricing.excluded_products where promo_id = %1$s;
				INSERT INTO base_pricing.excluded_products
					(promo_id, product_id, product_cid, product_name)
				select
					%1$s as promo_id,
					l5_id as product_id,
					product_id as product_cid,
					product_name
				from
					base_pricing.product_master pm
				where
					product_id in (%2$s)', _promo_id, array_to_string(_arr_data, ', '));
		raise notice ' ins copy paste query --  %', query;
		execute query;

	elsif _exclusion_type = 3 then
		-- product group
		raise notice ' product group';
		query := format('
				DELETE FROM base_pricing.excluded_product_groups where promo_id = %1$s;
				INSERT INTO base_pricing.excluded_product_groups
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

	elsif _exclusion_type = 4 then
		-- upload excel
		raise notice ' upload excel';
		for _data in select * from json_array_elements(_json_data)
		loop
			if (_data->>'l0_id' is not null) then
				raise notice'0';
				insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %4$L, %5$s, %6$L)', _promo_id, level_cid_mapping_dict->>'l0_cid', _data->'l0_cid', _data->>'l0_cuq' , combination_counter, _data->>'l0_id'));
			end if;

			if _data->>'l1_id' is not null then
				insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %4$L, %5$s, %6$L)', _promo_id, level_cid_mapping_dict->>'l1_cid', _data->'l1_cid', _data->>'l1_cuq', combination_counter, _data->>'l1_id'));
			end if;

			if _data->>'l2_id' is not null then
				insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %4$L, %5$s, %6$L)', _promo_id, level_cid_mapping_dict->'l2_cid', _data->'l2_cid', _data->>'l2_cuq', combination_counter, _data->>'l2_id'));
			end if;

			if _data->>'l3_id' is not null then
				insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %4$L, %5$s, %6$L)', _promo_id, level_cid_mapping_dict->'l3_cid', _data->'l3_cid', _data->>'l3_cuq', combination_counter, _data->>'l3_id'));
			end if;

			if _data->>'l4_id' is not null then
				insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %4$L, %5$s, %6$L)', _promo_id, level_cid_mapping_dict->'l4_cid', _data->'l4_cid', _data->>'l4_cuq', combination_counter, _data->>'l4_id'));
			end if;

			if _data->>'l5_id' is not null then
				insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %4$L, %5$s, %6$L)', _promo_id, level_cid_mapping_dict->'l5_cid', _data->'l5_cid', _data->>'l5_cuq', combination_counter, _data->>'l5_id'));
			end if;

			if _data->>'mfg_no' is not null then
				insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, %4$L, %5$s, %6$L)', _promo_id, level_cid_mapping_dict->'brand_id', _data->'brand_cid', _data->>'mfg_name', combination_counter, _data->>'mfg_no'));
			end if;

--			for h_level, h_value in SELECT key, value FROM json_each(_data)
--			loop
--				raise notice '   % ---- % ', h_level, h_value;
--				if h_value is not null and h_value::text <> '' and h_value::text <> 'null' then
--					insert_values_str_arr := array_append(insert_values_str_arr, format('(%1$s, %2$s, %3$s, '''', %4$s)', _promo_id, level_id_mapping_dict->h_level, h_value, combination_counter));
--				end if;
--			end loop;

			combination_counter = combination_counter + 1;
			raise notice '    -------- %  ', array_to_string(insert_values_str_arr, ', ');
		end loop;

		query := format('
				DELETE FROM base_pricing.excluded_hierarchy_combination where promo_id = %1$s;
	            INSERT INTO base_pricing.excluded_hierarchy_combination
	            	(promo_id, hierarchy_level_id, hierarchy_cid, hierarchy_cuq, combination_identifier, hierarchy_id)
	            VALUES
					%2$s;
				', _promo_id, array_to_string(insert_values_str_arr, ', '));
		raise notice 'ins upload data query -------- %', query;
		execute query;


	end if;

end
$function$
;

