--liquibase formatted sql
--changeset nuttu.hariprasad@impactanalytics.co:form_attribute_table_where_clause runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for form_attribute_table_where_clause
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.form_attribute_table_where_clause(input text, text, jsonb);
CREATE OR REPLACE FUNCTION global.form_attribute_table_where_clause(input text, text, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
   	declare
   	_dimension text;
   	_key text;
   	_value text;
   	_query_pa text := '';
   	_filter text;
   	_dt text;
   	_dt_sql text;
   	_con text[];
   	_con_val text;
   	_combine_where text[];
   	_attr_cols text[] := array[]::text[];
 	_group_filter text = '';
   	_where text := '';
   	_list_values text;
 	_group_pkey text;
   begin
 	
 	if $1 = 'product_attributes' then
 		_dimension := 'product';
 	elseif $1 = 'store_attributes' then
 		_dimension := 'store';
 	end if;
 	
   	for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
		_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
	   	raise notice '%', 'here';
		raise notice '%', _key;
 	  	if _key = any('{"product_group", "store_group"}'::varchar[]) then
 	  		raise notice '% group', _key;
 		  	-- if filter is a group, handle it specifically
			select
				CASE
				WHEN concat(array_agg(value)) IS NULL THEN ARRAY['']
				ELSE array_agg(value)
				END
			into _list_values from json_array_elements_text(((json_extract_path(_value::json, '0')::json)->>'values')::json);
			--select concat(array_agg(value)) into _list_values from json_array_elements_text(((json_extract_path(_value::json, '0')::json)->>'values')::json);
 		  	--select concat(array_agg(value)) into _list_values from json_array_elements_text((json_array_elements((_value::json)->1)->>'values');
 			raise notice '%', _list_values;
 	  		if cardinality(_list_values::varchar[]) > 0 then
 				_group_pkey := concat(substring(_dimension from 1 for 1), 'g_code');
 		  		_group_filter := 'select distinct x.' || $2 || ' from global.'|| _dimension || '_groups gp join global.'|| _dimension || '_groups_mapping x on gp.' ||_group_pkey|| ' = x.'|| _group_pkey ||' where is_deleted = false and name = any(''' || _list_values ||'''::varchar[])';
 			  	_con := array_append(_con, '( ' || $2 || ' in (' || _group_filter || ') )');
 				raise notice '%', _con;
 			end if;
 		else 
 			_attr_cols := array_append(_attr_cols, _key);
 			raise notice '_attr_cols %', _attr_cols;
 			_dt_sql := 'select coalesce(max(datatype), ''varchar'') from "global".' || $1 || '_list where attribute_name = ''' || _key || ''';';
 			execute _dt_sql into _dt;
 			for _filter in SELECT * FROM json_array_elements(_value::json) loop
 				if (_filter::json)->>'type' = 'custom' then
 					if (_filter::json)->>'values' = 'null' then
 						_con_val := ((_filter::json)->>'values');
 					else
 						_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
 					end if;
 					_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
 				elseif (_filter::json)->>'type' = 'list' then
 					if coalesce((_filter::json)->>'values','[]') = '[]' then
           				continue;
        			end if;
					select concat(array_agg(value)) into _list_values from json_array_elements_text(((_filter::json)->>'values')::json);
 					if (_filter::json)->>'operator' = 'in' then
 						-- _con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
 						_con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
 					else
 						-- _con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
 						_con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
 					end if;
 				elseif (_filter::json)->>'type' = 'expression' then
 					_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
 				end if;
 			end loop;
 		end if;
 		raise notice 'after loop%',cardinality(_con);
		if cardinality(_con) > 0 then
			_combine_where := array_append(_combine_where, ARRAY_TO_STRING(_con, ' AND ', ''));
			_con := array[]::text[];
  		end if;
 	end loop;
    	if cardinality(_combine_where) > 0 then
   		_where := ' WHERE ' || array_to_string(_combine_where, ' AND ', '');
   	end if;
   	if not ($2 = any(_attr_cols)) then
   		-- add the primary key if its not present in json arg.
   		_attr_cols := array_append(_attr_cols, $2);
   	end if;
   	raise notice '_where %', _where;
   	return _where;
 end $function$
;
