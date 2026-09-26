--liquibase formatted sql
--changeset liquibase:update_plan_cluster_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_plan_cluster_stores
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.update_plan_cluster_stores(input jsonb, jsonb);
CREATE OR REPLACE FUNCTION cluster_smart.update_plan_cluster_stores(input jsonb, jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
	_delete_query text := '';
	_value text;
	_key text;
	_stores text;
	_delete_store_codes text;
	_where_clause text[];
	_attr_val text;
	_insert_query text := '';
	_insert_cluster_code text;
	_insert_store_codes text;
	_insert_vals text[];
begin 
	for _key, _stores in select * from jsonb_each_text($1)  WHERE value IS NOT NULL loop
		_delete_store_codes := replace(replace(_stores, '[', '{'), ']', '}');
		_where_clause := array_append(_where_clause, '(cluster_bucket_code='|| _key ||' and attribute_name=''store_code'' and attribute_value = any(''' || _delete_store_codes ||'''::text[] ) )');
	end loop;
	if cardinality(_where_clause) > 0 then
		_delete_query := 'delete from cluster_smart.plan_cluster_bucket_map_attributes where ' || array_to_string(_where_clause, ' or ') || ';';
		execute _delete_query;
	end if;

	for _insert_cluster_code , _insert_store_codes in select * from jsonb_each_text($2)  WHERE value IS NOT NULL loop 
		for _value in select * from json_array_elements_text(_insert_store_codes::json)
		loop
			raise notice ' value %', _value;
			_insert_vals := array_append(_insert_vals, ('('|| _insert_cluster_code ||', '||'''store_code'''||', '''|| _value||''')'));
			raise notice ' _insert vals %', _insert_vals;
		end loop;
	end loop;
	if cardinality(_insert_vals) > 0 then
		_insert_query := 'INSERT INTO "cluster_smart".plan_cluster_bucket_map_attributes (cluster_bucket_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_insert_vals, ', ', '')) || ';';
		execute _insert_query;
	end if;
end
$function$
;
