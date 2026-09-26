--liquibase formatted sql
--changeset suba.nataraj:form_attribute_table_filters runOnChange:true stripComments:false splitStatements:false context:MTP-38099 labels:liquibase_project_start
--comment: initial changeset for form_attribute_table_filters - MTP 38099, added varchar in list check
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.form_attribute_table_filters(input text, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.form_attribute_table_filters(input text, text, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 	declare
 	_key text;
 	_value text;
 	_query_pa text := '';
 	_filter text;
 	_dt text;
 	_dt_sql text;
 	_con text[];
 	_con_val text;
 	_where text;
 	_counter integer := 1;
 	_attr_cols text[] := array['pa1.' || $2]::text[];
 	_req_attr text;
 	_req_attr_sql text;
	_join_type text;
 begin
 	for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL order by value desc loop 
 			_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
 			_dt_sql := 'select coalesce(max(datatype), ''varchar'') from "inventory_smart".' || $1 || '_list where attribute_name = ''' || _key || ''';';
 			execute _dt_sql into _dt;
 			_req_attr_sql := 'select attribute_name from "inventory_smart".' || $1 || '_list where attribute_name = ''' || _key || ''';';
-- 			raise notice '% _req_attr_sql', _req_attr_sql;
 			execute _req_attr_sql into _req_attr;
-- 			raise notice '% _req_attr', _req_attr;

 			if _req_attr is not null or $1 != 'plan_attributes'::text then
 				_attr_cols := array_append(_attr_cols, _key);
 				_con := array['attribute_name = ''' || _key || '''']::text[];
 				raise notice '% _dt', _dt;
	 			for _filter in SELECT * FROM json_array_elements(_value::json) loop
	 				if (_filter::json)->>'type' = 'custom' then
	 					if (_filter::json)->>'values' = 'null' then
	 						_con_val := ((_filter::json)->>'values');
	 					else
	 						_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
	 					end if;
	 					_con := array_append(_con, '(attribute_value::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
	 				elseif (_filter::json)->>'type' = 'list' then
	 					if (_filter::json)->>'operator' = 'in' then
	 						if _dt = 'varchar' then
								_con := array_append(_con, '(attribute_value::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '))');
							else
	 							_con := array_append(_con, '(attribute_value::' || _dt || ' && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || ')');
							end if;
	 					else
	 						_con := array_append(_con, 'NOT(attribute_value::' || _dt || ' && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || ')');
	 					end if;
	 				elseif (_filter::json)->>'type' = 'expression' then
	 					_con := array_append(_con, '(attribute_value::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
	 				end if;
	 			end loop;
	 		
 			_where = ARRAY_TO_STRING(_con, ' AND ', '');
			IF cardinality(_con) > 1 THEN
				_join_type = ' JOIN ';
			ELSE
				_join_type = ' LEFT JOIN ';
			END IF;
-- 			raise notice ' query pa %', _query_pa;
 			if _counter = 1 then
 				_query_pa := _query_pa || '(select ' || $2 || ', attribute_value::' || _dt || ' as ' || _key || ' from "inventory_smart".' || $1 || ' where ' || _where || ') pa' || _counter;
 			else
 				_query_pa := _query_pa || _join_type || ' (select ' || $2 || ', attribute_value::' || _dt || ' as ' || _key || ' from "inventory_smart".' || $1 || ' where ' || _where || ') pa' || _counter || ' on pa1.' || $2 || ' = pa' || _counter || '.' || $2;
 			end if;
 			_counter = _counter + 1;
 			end if;
-- 		 	raise notice ' query pa counter % % %', _query_pa, _counter, _where;
 		end loop;
-- 		raise notice ' attri cols % %', _attr_cols, _query_pa;
 		_query_pa := 'select ' || array_to_string(_attr_cols, ', ', '') ||' from' || _query_pa;
 	return _query_pa;
 end $function$
;
