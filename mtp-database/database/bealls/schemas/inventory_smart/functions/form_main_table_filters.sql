--liquibase formatted sql
--changeset karthikeswar.saravanan@impactanalytics.co:form_main_table_filters runOnChange:true stripComments:false splitStatements:false context:form_main_table_filters labels:form_main_table_filters
--comment: form_main_table_filters - intial sync version
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.form_main_table_filters(input text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.form_main_table_filters(input text, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_val text;
	_filter text;
	_dt text;
	_con text[];
	_temp_str jsonb;
	_con_val text;
	_where text := '';
	_dimension text := 'product';
	_list_values text;
 	_group_pkey text;
 	_group_filter text = '';
begin
	for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
		_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g'); 
		raise notice '%', _key;
		raise notice 'v%', _value;
		if _key = 'product_group' then
 			-- if filter is a group, handle it specifically
			if (_value = '[]') IS FALSE
			then
	 			select concat(array_agg(value)) into _list_values from json_array_elements_text(((json_extract_path(_value::json, '0')::json)->>'values')::json);
	 			--select concat(array_agg(value)) into _list_values from json_array_elements_text((json_array_elements((_value::json)->1)->>'values');
	 			
	 			if cardinality(_list_values::varchar[]) > 0 then 
	 				_group_pkey := concat(substring(_dimension from 1 for 1), 'g_code');
	 				_group_filter := 'select array_agg(distinct x.' || _dimension  || '_code) from global.'|| _dimension || '_groups gp join global.'|| _dimension || '_groups_mapping x on gp.' ||_group_pkey|| ' = x.'|| _group_pkey ||' where is_deleted = false and name = any(''' || _list_values ||'''::varchar[])';
	 				_con := array_append(_con, '( ' || _dimension || '_codes <@ (' || _group_filter || ') )');
	 			end if;
	 		end if;
		elseif (_key = 'sizes' or _key = 'uda_value_desc') and jsonb_array_length(_value::jsonb) > 0 then 
			--if fitler is sizes, handle it seperately 
			select concat(json_agg(value)) into _temp_str from json_array_elements_text(((json_extract_path(_value::json, '0')::json)->>'values')::json);
			raise notice '_temp_str %', _temp_str;	
			_val =  replace(replace(_temp_str::text,'[','{'),']','}');
			_val = _key || ' && ''' || _val::text || '''::varchar[]';
			_con = array_append(_con, '( ' || _val || ')');
			raise notice 'v %', _con;	
 		else
			select coalesce(max(udt_name), 'varchar') INTO _dt from information_schema.columns where table_schema = 'inventory' and table_name = $1 and column_name = _key;
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
						_con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
					else
						_con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
					end if;
				elseif (_filter::json)->>'type' = 'expression' then
					_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
				end if;
			end loop;
		end if;
		if cardinality(_con) > 0 then
			_where = ' WHERE ' || (ARRAY_TO_STRING(_con, ' AND ', ''));
		end if;
		raise notice '%', _where;
	end loop;
	return _where;
end
$function$
;