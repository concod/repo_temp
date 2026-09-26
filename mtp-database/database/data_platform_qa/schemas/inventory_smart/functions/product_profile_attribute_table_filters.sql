--liquibase formatted sql
--changeset liquibase:product_profile_attribute_table_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_attribute_table_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_profile_attribute_table_filters(input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_profile_attribute_table_filters(input jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 	declare
 	_key text;
 	_value text;
 	_filter text;
 	_dt text;
 	_dt_sql text;
 	_con text[];
 	_con_val text;
 	_where text;
 begin
 	for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
	 	  	select coalesce(max(udt_name), 'varchar') INTO _dt from information_schema.columns where table_schema = 'inventory_smart' and table_name = 'product_profile_attributes_filter' and column_name = _key;
 			for _filter in SELECT * FROM json_array_elements(_value::json) loop
 				if (_filter::json)->>'type' = 'list' then
 					if (_filter::json)->>'operator' = 'in' then
 						_con := array_append(_con, '(' || _key || '::text[] && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::text[] or ' || _key || '::text is null )');
 					else
 						_con := array_append(_con, 'NOT(' || _key || '::text[] && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::text[])');
 					end if;
 				end if;
 			end loop;
 			_where = ARRAY_TO_STRING(_con, ' AND ', '');
 		end loop;
 	return _where;
 end $function$
;