--liquibase formatted sql
--changeset liquibase:update_plan_cluster_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_plan_cluster_stores
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.update_plan_cluster_stores(input text);
CREATE OR REPLACE FUNCTION assort.update_plan_cluster_stores(input text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
	_query text;
	_value json;
	_key text;
	_attr_val int;
	_cluster_code text;
	_insert_query text;
	_insert_cluster_code int;
	_insert_store_codes text[];
	_insert_vals text[];
begin 
	/*for _value in select * from jsonb_array_elements($1)
	loop 
		for _key, _attr_val in SELECT * FROM jsonb_each_text(_value::jsonb)-- WHERE _attr_val IS NOT NULL 
		loop
			if _key = 'store_code' then
				_store_code:= '(' || replace(replace(_attr_val, '[', ''), ']', '') || ')';
			else
				_cluster_code := _attr_val::int;
			
			end if;
		end loop;
		_query := 'delete from "assort".plan_cluster_bucket_map_attributes where cluster_code =' || _cluster_code || ' and attribute_name="store_code" and attribute_value in '|| _store_code ||' ;';
		raise notice '%', _query;
		--execute _query;
	end loop;
	*/
	--for _attr_val in SELECT * FROM jsonb_each_text(_value::jsonb)
	--loop
	--_cluster_code := array_append(_cluster_code, _attr_val);
	--end loop;
	_cluster_code := '(' || replace(replace($1, '[', ''), ']', '') || ')';
	raise notice ' cluster code %', _cluster_code;
	--_cluster_code := '(' || replace(replace($1, '[', ''), ']', '') || ')';
	_query := 'delete from "assort".plan_cluster_bucket_map_attributes where cluster_bucket_code in ' || _cluster_code || ' and attribute_name = "store_code";';
	raise notice '%', _query;
	-- insert stores to bucket map
	/*for _value in select * from jsonb_array_elements($2)
	loop
		for _key , _attr_val in select * from jsonb_each_text(_value::jsonb)
		loop 
			if _key = 'store_code' then
				_insert_store_codes := replace(replace(_attr_val, '[', '{'), ']', '}'); --_attr_val::text[];
			else 
				_insert_cluster_code := _attr_val::int;
				raise notice '%', _attr_val;
			end if;
		end loop;
		foreach _value in array _insert_store_codes
		loop
			_insert_vals := array_append(_insert_vals, ('('|| _insert_cluster_code ||', "store_code", '''|| _value::varchar||''')'));
		end loop;
		
		_insert_query := 'INSERT INTO "assort".plan_cluster_bucket_map_attributes (cluster_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_insert_vals, ', ', '')) || ';';
		raise notice '%', _insert_query;
		--execute _insert_query
	end loop;*/
end
$function$
;