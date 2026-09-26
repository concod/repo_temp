--liquibase formatted sql
--changeset akshay.jain@impactanalytics:MTP-60825_revert runOnChange:true stripComments:false splitStatements:false context:MTP-60825_1 labels:MTP-60825_1_revert
--comment: inner pa query modified to fetch hierarchy related columns, fixed for duplicate records reverted
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.form_attribute_table_filters_v2(input text, text, jsonb);
CREATE OR REPLACE FUNCTION global.form_attribute_table_filters_v2(input text, text, jsonb)
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
 	_multi_dimension_table_name text := 'product_store_attributes_filter';
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
	_filtered_combine_where text[];
	_data_types_dict JSONB;
	dtype_dict_query text;
	_attr_cols_new TEXT[] := array[]::text[];
	hierarchy_info_for_client text;
  	product_hierarchy_columns text;
	user_access_data jsonb;
	_access_hierarchy_data jsonb;
	hierarchy_keys text[];
	hkey text;
	hierarchy_cols jsonb;
	item TEXT;

   begin
 	
 	if $1 = 'product_attributes' then
 		_dimension := 'product';
 	elseif $1 = 'store_attributes' then
 		_dimension := 'store';
 	elseif $1 = 'product_store_attributes' then
 		_dimension := 'product_store';
 	end if;
 
 	SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'global' AND table_name = _multi_dimension_table_name
    ) INTO _is_multi_dimension_table_exists;
	

	select * from global.fetch_user_access_hierarchy_for_module(_dimension) into _access_hierarchy_data;

	user_access_data := _access_hierarchy_data->'access_hierarchy';
	hierarchy_info_for_client := _access_hierarchy_data->'hierarchy_info_for_client';
	hierarchy_info_for_client := trim('"' FROM hierarchy_info_for_client);

 	
   	for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
		_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
	   	raise notice '%', 'here';
		raise notice '%', _key;
		if _key = any('{"aggregation_group"}'::varchar[]) then
 	  		raise notice '% group', _key;
			select
				CASE
				WHEN concat(array_agg(value)) IS NULL THEN ARRAY['']
				ELSE array_agg(value)
				END
			into _list_values from json_array_elements_text(((json_extract_path(_value::json, '0')::json)->>'values')::json);
 			raise notice '%', _list_values;
 	  		if cardinality(_list_values::varchar[]) > 0 then
		           	_group_pkey := concat(substring(_dimension from 1 for 1), 'g_code');
					raise notice '%', $2;
 		  			_group_filter := 'select distinct x.aggregation_code from global.'|| _dimension || '_groups gp join global.'|| _dimension || '_groups_aggregation_mapping x on gp.' ||_group_pkey|| ' = x.'|| _group_pkey ||' where is_deleted = false and name = any(''' || _list_values ||'''::varchar[])';
 			  		_con := array_append(_con, '( article in (' || _group_filter || ') )');
 				raise notice '%', _con;
				raise notice 'AGGREGATE GROUP CONDITION';
 			end if;
 	  	elseif _key = any('{"product_group", "store_group"}'::varchar[]) then
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
						if _is_multi_dimension then
							 _look_up_filters := array_append(_look_up_filters, '(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
						else
							-- if column type is of list then search happens differently. @> operator depicts only if all selected values qualify for row we will show data
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
	/*
	--Below commented piece can come handy if we want to use unnest in select statement also. For now we are handling filtering (where clause) for list based columns
	if _dimension != 'product_store' then
  
   		dtype_dict_query := 'SELECT jsonb_object_agg(attribute_name, COALESCE(datatype, ''varchar''))
				    FROM (
				        SELECT 
				            attr AS attribute_name,
				            (SELECT datatype
				             FROM global.'||_dimension||'_attributes_list
				             WHERE attribute_name = attr
				             LIMIT 1) AS datatype
				        FROM UNNEST(ARRAY[' || array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(_attr_cols) AS x), ', ') || ']::TEXT[]) AS attr
				    ) subquery';
	    
	 
	 	execute dtype_dict_query into _data_types_dict;
	 
	 	
		SELECT ARRAY(
	        SELECT CASE
	                 -- If the datatype is "list", modify the column name
	                 WHEN _data_types_dict -> attr_key in ('"varchar[]"', '"text[]"', '"list"', '"integer[]"') THEN 
	                     'unnest(' || attr_key || ') as ' || attr_key || ''
	                 -- Otherwise, keep the original attribute name
	                 ELSE attr_key
	               END
	        FROM unnest(_attr_cols) AS attr_key
	    ) INTO _attr_cols_new;
	end if;

	
	IF array_length(_attr_cols_new, 1) IS NULL THEN
		
   		_attr_cols_new = _attr_cols;
   
   	end if;
   	
   	*/
	
	IF  _is_multi_dimension_table_exists and _multi_dimension_where is not null THEN
		
		--remove active and is_deleted filters in case we are joining with multi dimension table
		if cardinality(_combine_where) > 0 then
			FOR i IN 1..array_length(_combine_where, 1) LOOP
	        	IF _combine_where[i] NOT LIKE '%is_deleted%' AND _combine_where[i] NOT LIKE '%active%' THEN
	            	_filtered_combine_where := _filtered_combine_where || _combine_where[i];
	        	END IF;
    		END LOOP;
			if cardinality(_filtered_combine_where) > 0 then
	   			_where := ' WHERE ' || array_to_string(_filtered_combine_where, ' AND ', '');
	   		end if;
		end if;

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
		raise notice ' common columns %', _common_columns; 

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

		FOR col_index IN ARRAY_LOWER(_attr_cols, 1) .. ARRAY_UPPER(_attr_cols, 1) LOOP
	    	-- Check if the current column in _common_columns is present in _attr_cols
	    	IF _attr_cols[col_index] = ANY(_common_columns) THEN
	        	-- Replace the column with psaf.column_name
	        	_attr_cols[col_index] := 'psaf.' || _attr_cols[col_index] || ' as ' || _attr_cols[col_index];
	    	END IF;
		END LOOP;

	    -- Remove the trailing ' AND ' from the join condition
	    _join_condition := TRIM(TRAILING ' AND ' FROM _join_condition);
	   	
	    -- Construct the query with the JOIN condition
		_query_pa := 'with final_result as ( SELECT ' || array_to_string(_attr_cols, ', ', '') || 
              ' FROM (SELECT ' || array_to_string(_multi_cols, ', ', '') || 
              ' FROM "global".' || _multi_dimension_table_name || ' ' || _multi_dimension_where || 
              ') ' || _product_alias || 
              ' JOIN "global".' || $1 || '_filter ' || _global_alias || 
              ' ON ' || _join_condition || 
              ' ) select * from final_result ' || _where;

	else
		-- Below loop add dimensional hierarchy attributes in select clause in inner query so that it works while making join in acces hierarchy data
		-- But before returning final query returning only relevant columns or column asked by calling SP because that SP might not expect something extra
		select (fetch_hierarchy_info_for_client->_dimension) from global.fetch_hierarchy_info_for_client() into hierarchy_cols;
		_attr_cols_new := _attr_cols;

		FOR item IN SELECT jsonb_array_elements_text(hierarchy_cols)
	    LOOP
	        -- Check if the item is already present in the text array
	        IF NOT (item = ANY(_attr_cols_new)) THEN
	            -- Append the item to the array
	            _attr_cols_new := array_append(_attr_cols_new, item);
	        END IF;
	    END LOOP;
    	_query_pa := 'SELECT ' || array_to_string(_attr_cols, ', ', '') || ' FROM "global".' || $1 || '_filter ' || _where;
		IF user_access_data IS NOT NULL AND user_access_data::text NOT IN ('null', '[]') THEN

			_query_pa := 'SELECT ' || array_to_string(_attr_cols_new, ', ', '') || ' FROM "global".' || $1 || '_filter ' || _where;
			_query_pa := format(
			    'SELECT ' || array_to_string(_attr_cols, ', ', '') || ' FROM (
			        SELECT *, %s AS access_hierarchy FROM ( %s ) temp
			    ) temp1
			    JOIN (
			        SELECT DISTINCT jsonb_array_elements(%L)->>%L  AS _access_hierarchy_user_data
			    ) temp2
			    ON temp2._access_hierarchy_user_data = temp1.access_hierarchy',
			    hierarchy_info_for_client,  -- Correctly inserted column names
			    _query_pa,  -- Inner query
			    user_access_data,  -- JSONB array data
				_dimension || '_hierarchy_id'
			);
		end if;
	raise notice '_query_pa %s', _query_pa;

	END IF;
   	return _query_pa;
 end $function$
;
