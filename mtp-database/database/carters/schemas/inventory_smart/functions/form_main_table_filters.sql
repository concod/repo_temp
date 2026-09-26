--liquibase formatted sql
--changeset pradeep.nayak@impactanalytics.co:form_main_table_filters_carters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 MTP-34366_ph_master labels:Carters_UseCase
--comment: handling ph_master for group filters
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
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
	for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
		_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g'); 
		raise notice '%', _key;
		raise notice 'v%', _value;
		if _key = any('{"product_group", "store_group"}'::varchar[]) then
            if _key = 'product_group' then
                _dimension := 'product';
            else
                _dimension := 'store';
            end if;
 			-- if filter is a group, handle it specifically
			if (_value = '[]') IS FALSE
			then
	 			select concat(array_agg(value)) into _list_values from json_array_elements_text(((json_extract_path(_value::json, '0')::json)->>'values')::json);
	 			--select concat(array_agg(value)) into _list_values from json_array_elements_text((json_array_elements((_value::json)->1)->>'values');
	 			
	 			if cardinality(_list_values::varchar[]) > 0 then 
	 				_group_pkey := concat(substring(_dimension from 1 for 1), 'g_code');
					if $1 = 'ph_master' then 
						_group_filter := 'select distinct x.' || _dimension  || '_code from global.'|| _dimension || '_groups gp join global.'|| _dimension || '_groups_mapping x on gp.' ||_group_pkey|| ' = x.'|| _group_pkey ||' where is_deleted = false and name = any(''' || _list_values ||'''::varchar[])';
	 					_con := array_append(_con, '( ' || _dimension || '_codes && array(' || _group_filter || ') )');
					else
	 					_group_filter := 'select distinct x.' || _dimension  || '_code from global.'|| _dimension || '_groups gp join global.'|| _dimension || '_groups_mapping x on gp.' ||_group_pkey|| ' = x.'|| _group_pkey ||' where is_deleted = false and name = any(''' || _list_values ||'''::varchar[])';
	 					_con := array_append(_con, '( ' || _dimension || '_code = any(' || _group_filter || ') )');
					end if;
	 			end if;
	 		end if;
		elseif _key = 'sizes' then 
			--if fitler is sizes, handle it seperately 
			select concat(json_agg(value)) into _temp_str from json_array_elements_text(((json_extract_path(_value::json, '0')::json)->>'values')::json);
			raise notice '_temp_str %', _temp_str;	
			_val =  replace(replace(_temp_str::text,'[','{'),']','}');
			_val = 'sizes && ''' || _val::text || '''::varchar[]';
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
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.form_main_table_filters', 'Before returning function value',_where,jsonb_build_object('table_name',$1,'JSON',$2));
	return _where;
end
$function$
;