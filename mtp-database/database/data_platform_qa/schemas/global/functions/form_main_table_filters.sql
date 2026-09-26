--liquibase formatted sql
--changeset akshay.jain:form_main_table_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: handeled list based search
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.form_main_table_filters(input text, jsonb);
CREATE OR REPLACE FUNCTION global.form_main_table_filters(input text, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 	declare
 	_key text;
 	_value text;
 	_filter text;
 	_dt text;
 	_con text[];
 	_con_val text;
 	_where text := '';
 	_dimension text;
   	_list_values text;
 	_group_pkey text;
 	_group_filter text = '';
 begin
 	_dimension := split_part($1, '_', 1);
 	for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
 	_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g'); 
 		if _key = any('{"product_group", "store_group"}'::varchar[]) then
 			raise notice '% group', _key;
 			-- if filter is a group, handle it specifically
 			select concat(array_agg(value)) into _list_values from json_array_elements_text(((json_extract_path(_value::json, '0')::json)->>'values')::json);
			raise notice '% list values', _list_values;
			if _list_values = '' then
				continue;
			end if;
 			--select concat(array_agg(value)) into _list_values from json_array_elements_text((json_array_elements((_value::json)->1)->>'values');
 			if cardinality(_list_values::varchar[]) > 0 then
 				_group_pkey := concat(substring(_dimension from 1 for 1), 'g_code');
 				_group_filter := 'select distinct x.' || _dimension  || '_code from global.'|| _dimension || '_groups gp join global.'|| _dimension || '_groups_mapping x on gp.' ||_group_pkey|| ' = x.'|| _group_pkey ||' where is_deleted = false and name = any(''' || _list_values ||'''::varchar[])';
 				_con := array_append(_con, '( ' || _dimension || '_code in (' || _group_filter || ') )');
 			end if;
 		else
 			select coalesce(max(udt_name), 'varchar') INTO _dt from information_schema.columns where table_schema = 'global' and table_name = $1 and column_name = _key;
 			for _filter in SELECT * FROM json_array_elements(_value::json) loop
 				if (_filter::json)->>'type' = 'custom' then
 					if (_filter::json)->>'values' = 'null' then
 						_con_val := ((_filter::json)->>'values');
 					else
 						_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
 					end if;
 					_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
 				elseif (_filter::json)->>'type' = 'list' then
 					if (_filter::json)->>'operator' = 'in' then
					-- in case of list column being searched, even if one value is present then also row will be fetched using below logic
						if _dt in ('varchar[]', 'text[]', 'integer[]', '_varchar') then
							_con := array_append(_con, '(' || _key || '::' || _dt || ' && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || ')');
						else
 							_con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
						end if;
 					else
 						_con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
 					end if;
 				elseif (_filter::json)->>'type' = 'expression' then
 					_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
 				end if;
 			end loop;
 		end if;
 	end loop;
 	if cardinality(_con) > 0 then
 		_where = ' WHERE ' || (ARRAY_TO_STRING(_con, ' AND ', ''));
 	end if;
 	raise notice '%', _where;
 	return _where;
 end $function$
;
