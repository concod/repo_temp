--liquibase formatted sql
--changeset akshay.jain:MTP-71767 runOnChange:true stripComments:false splitStatements:false context:MTP-71767 labels:MTP-71767
--comment: adding support for filter on list based column overlap search
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.form_attribute_table_filters_rcl_level(input text, text, jsonb, text , text);
CREATE OR REPLACE FUNCTION global.form_attribute_table_filters_rcl_level(input text, text, jsonb, text DEFAULT ''::text, text DEFAULT ''::text)
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
 	_is_multi_dimension bool := false;
 	_common_columns text[];
 	_is_multi_dimension_table_exists bool := false;
 	_multi_dimension_table_name text := 'product_store_attributes_filter' || $4;
 	_global_alias text;
 	_product_alias text;
 	_join_condition text;
 	_is_attribute_exists text;
 	_look_up_filters text[];
 	_multi_dimension_cols text[];
 	_combine_multi_dimension_where text[];
 	_multi_dimension_where text;
	_multi_join_cols text[];
 	_multi_cols text[];
 	_paf_additonal_attributes text[];
	_filtered_combine_where text[];
	_hash_cols text;
	_rcl_codes integer[];
	_levels text[];
	_filtered_attr_cols TEXT[] := ARRAY[]::TEXT[];

   begin
	   
 	
 	if $1 = 'product_attributes' then
 		_dimension := 'product';
 	elseif $1 = 'store_attributes' then
 		_dimension := 'store';
 	elseif $1 = 'product_store_attributes' then
 		_dimension := 'product_store';
 	end if;
 
 	select
		array_agg(distinct rcl_code),
		'array[' || string_agg(distinct 'rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[]', array_agg(distinct lev) into _rcl_codes, _hash_cols, _levels 
	from global.rcl_master, unnest(level) as lev
	where not is_deleted
	and module_code = $5::int
	group by is_deleted;

	raise notice 'levels %', _levels;

	SELECT array_agg(key)
        FROM jsonb_object_keys($3) AS key
        WHERE key NOT IN (SELECT unnest(_levels)) into _paf_additonal_attributes;
       
    
    raise notice 'levels %', _levels;
       
       
    raise notice '_paf_additonal_attributes %', _paf_additonal_attributes;
	
       
      
 
 	SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'global' AND table_name = _multi_dimension_table_name
    ) INTO _is_multi_dimension_table_exists;


	-- Dynamically retrieve common column names
	    SELECT array_agg(column_name)
	    INTO _common_columns
	    FROM information_schema.columns
	    WHERE table_name = _multi_dimension_table_name
		AND table_schema = 'global'
	    AND column_name IN (
	        SELECT column_name
	        FROM information_schema.columns
	        WHERE table_name =  $1 || '_filter'
			AND table_schema = 'global'
	    );
   
 	
   	for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
		--_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
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
			if _dimension != 'product_store' then 
	 			_dt_sql := 'select coalesce(max(datatype), ''varchar'') from "global".' || $1 || '_list where attribute_name = ''' || _key || ''';';
	 			execute _dt_sql into _dt;
			else
				_dt := 'varchar';
			end if;

 			for _filter in SELECT * FROM json_array_elements(_value::json) loop
 				if (_filter::json)->>'type' = 'custom' then
 					if (_filter::json)->>'values' = 'null' then
 						_con_val := ((_filter::json)->>'values');
 					else
 						_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
 					end if;
 					_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
 				elseif (_filter::json)->>'type' = 'list' then
					if _dimension is not null and _dimension != 'product_store' and coalesce((_filter::json)->> 'dimension', _dimension) = 'product_store' then
						_is_multi_dimension := true;
						_multi_join_cols := array_append(_multi_join_cols, _key);
					end if;

 					if coalesce((_filter::json)->>'values','[]') = '[]' then
           				continue;
        			end if;
					select concat(array_agg(value)) into _list_values from json_array_elements_text(((_filter::json)->>'values')::json);
 					if (_filter::json)->>'operator' = 'in' then
 						-- _con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
						if _is_multi_dimension and _key not in (SELECT UNNEST(_common_columns)) then
							_look_up_filters := array_append(_look_up_filters, '(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
						ELSIF _is_multi_dimension and _key in (SELECT UNNEST(_common_columns)) then
							_look_up_filters := array_append(_look_up_filters, '(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
							if _dt in ('varchar[]', 'text[]', 'integer[]') then
								_con := array_append(_con, '(' || _key || '::' || _dt || ' && ''' || _list_values || '''::' || _dt || '[])');
							else
								_con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
							end if;
							
						else
							if _dt in ('varchar[]', 'text[]', 'integer[]') then
								_con := array_append(_con, '(' || _key || '::' || _dt || ' && ''' || _list_values || '''::' || _dt || '[])');
							else
								_con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
							end if;		
			
 						end if;
 					else
 						-- _con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
						if _is_multi_dimension then
							 _look_up_filters := array_append(_look_up_filters, 'NOT(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
						else
 							_con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
						end if;
 					end if;
					_is_multi_dimension := false;
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
		if cardinality(_look_up_filters) > 0 then
			_combine_multi_dimension_where := array_append(_combine_multi_dimension_where, ARRAY_TO_STRING(_look_up_filters, ' AND ', ''));
			_look_up_filters := array[]::text[];
  		end if;
 	end loop;

    if cardinality(_combine_where) > 0 then
   		_where := ' WHERE ' || array_to_string(_combine_where, ' AND ', '');
   	end if;
	
	if cardinality(_combine_multi_dimension_where) > 0 then
   		_multi_dimension_where := ' WHERE ' || array_to_string(_combine_multi_dimension_where, ' AND ', '');
   	end if;
	
	raise notice ' combination %',_multi_dimension_where;

   	if $2 != '' and not ($2 = any(_attr_cols)) then
   		-- add the primary key if its not present in json arg.
   		_attr_cols := array_append(_attr_cols, $2);
   	end if;

	IF  _is_multi_dimension_table_exists and _multi_dimension_where is not null then
		raise notice '_is_multi_dimension_table_exists where exist';
		--remove active and is_deleted filters in case we are joining with multi dimension table
		if cardinality(_combine_where) > 0 then
			raise notice 'combine where exist';
			FOR i IN 1..array_length(_combine_where, 1) LOOP
	        	IF _combine_where[i] NOT LIKE '%is_deleted%' AND _combine_where[i] NOT LIKE '%active%' THEN
	            	_filtered_combine_where := _filtered_combine_where || _combine_where[i];
	        	END IF;
    		END LOOP;
			if cardinality(_filtered_combine_where) > 0 then
	   			_where := ' WHERE ' || array_to_string(_filtered_combine_where, ' AND ', '');
	   		end if;
		end if;

		SELECT array_agg(column_name)
	    INTO _multi_cols
	    FROM information_schema.columns
	    WHERE table_name = _multi_dimension_table_name
		AND table_schema = 'global';
	
	    -- Assign aliases to the tables
	    _global_alias := 'paf';
	    _product_alias := 'psaf';
	
	    -- Construct the JOIN condition using aliases
	    _join_condition := '';
    	FOR col_index IN ARRAY_LOWER(_common_columns, 1) .. ARRAY_UPPER(_common_columns, 1) LOOP
			IF _common_columns[col_index] NOT IN (SELECT UNNEST(_multi_join_cols)) THEN
        		_multi_join_cols := array_append(_multi_join_cols,  _common_columns[col_index]);
    		END IF;
        	_join_condition := _join_condition || _product_alias || '.' || _common_columns[col_index] || ' = ' || _global_alias || '.' || _common_columns[col_index] || ' AND ';
    	END LOOP;
    	
    	raise notice 'array columns1 %', _attr_cols;
    	raise notice 'levels %', _levels;
    
    	_attr_cols := ARRAY(
			    SELECT elem
			    FROM unnest(_attr_cols) AS elem
			    WHERE elem NOT IN (SELECT unnest(_levels))
		);
	
		raise notice 'array columns2 %', _attr_cols;
	
	

		FOR col_index IN ARRAY_LOWER(_attr_cols, 1) .. ARRAY_UPPER(_attr_cols, 1) LOOP
	    	-- Check if the current column in _common_columns is present in _attr_cols
			raise notice 'now here';
			
	    	IF _attr_cols[col_index] = ANY(_common_columns) or  _attr_cols[col_index] = ANY(_multi_cols) then
	    		raise notice 'now here also';
	        	-- Replace the column with psaf.column_name
	        	_attr_cols[col_index] := 'psaf.' || _attr_cols[col_index] || ' as ' || _attr_cols[col_index];
	        else
	        	_attr_cols[col_index] := 'paf.' || _attr_cols[col_index] || ' as ' || _attr_cols[col_index];
	    	END IF;
		END LOOP;
	
	
	    -- Remove the trailing ' AND ' from the join condition
	    _join_condition := TRIM(TRAILING ' AND ' FROM _join_condition);

		if not ('store_code' = ANY(_multi_cols)) then 
			_multi_cols := array_append(_multi_cols, 'store_code');

		end if;
			
		if not ('store_code' = ANY(_attr_cols)) then 
			_attr_cols := array_append(_attr_cols, 'psaf.store_code as psaf_store_code');
		end if;
	   
	
	    -- Construct the query with the JOIN condition
		_query_pa := 'with final_result as ( SELECT rpmps.rcl_code, rpmps.rule_code, rpmps.rcl_dimension, ' || array_to_string(_attr_cols, ', ', '') || 
              ' FROM (SELECT ' || array_to_string(_multi_cols, ', ', '') || 
              ' FROM "global".' || _multi_dimension_table_name || ' ' || _multi_dimension_where || 
              ') ' || _product_alias || 
              ' JOIN (select * from "global".' || $1 || '_filter paf ' || _where ||  ')' || _global_alias ||
              ' ON ' || _join_condition ||
              ' JOIN global.rcl_product_mapping_product_store_rule rpmps ON md5(rpmps.rcl_dimension::text) = any('|| _hash_cols ||')
				JOIN global.rcl_master r on r.rcl_code = rpmps.rcl_code
              and r.rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
              ) select distinct * from final_result ';

	else
	
		_attr_cols := ARRAY(
			    SELECT elem
			    FROM unnest(_attr_cols) AS elem
			    WHERE elem NOT IN (SELECT unnest(_levels))
		);
		FOR col_index IN ARRAY_LOWER(_attr_cols, 1) .. ARRAY_UPPER(_attr_cols, 1) LOOP
		    	-- Check if the current column in _common_columns is present in _attr_cols
				
		        	_attr_cols[col_index] := 'paf.' || _attr_cols[col_index] || ' as ' || _attr_cols[col_index];
			END LOOP;
    	_query_pa := 'SELECT rpmps.rcl_code, rpmps.rule_code, rpmps.rcl_dimension, ' || array_to_string(_attr_cols, ', ', '') || ' FROM (select * from "global".' || $1 || '_filter' || $4::text || ' paf ' || _where|| ' ) paf JOIN global.rcl_product_mapping_product_store_rule rpmps ON md5(rpmps.rcl_dimension::text) = any('|| _hash_cols || ') 
		JOIN global.rcl_master r on r.rcl_code = rpmps.rcl_code		
		and 
               r.rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[]) ';
	END IF;
   	raise notice '_query_pa %', _query_pa;
   	return _query_pa;
 end $function$
;