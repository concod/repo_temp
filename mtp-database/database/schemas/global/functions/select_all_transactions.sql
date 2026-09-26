--liquibase formatted sql
--changeset akshay.jain:list_search_set_all_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:list_search_set_All_1
--comment: bug fix search on list column during set-all
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.select_all_transactions(input text, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.select_all_transactions(input text, jsonb, jsonb, boolean)
 RETURNS TABLE(set_all_data json)
 LANGUAGE plpgsql
AS $function$
 	declare
    	query text := '';
    	s text;
     where_clause text := '';
    	_filter text;
    	_update_query text;
   	_check_uncheck_status text;
   	_unique_column_list text[];
  	_unique_column_str text;
  	_attribute_json_build_column_for_return  text[];
  	_return_column_list text[];
  	_key text;
  	_value text;
  	input_arg text[];
  	_input_arg_str text;
  	_column_name text;
  	_refcursor_sp_query text;
  _count_temp_table int;
	sql_query text;
  	
 	/*
 	 * Function/Procedure name: global.select_all_transactions
 	 * Input args : $1 - SP name
 	 * 				$2 - Input params of SP (of $1)
 	 * 				$3 - selection key (transaction data)
 	 * 				$4 - boolean flag True if cursor based else pass false
 	 * Sample Calling statement - select * from global.select_all_transactions('global.store_status_list_attr', '{"0": {} ,"1": {"zipcode": [], "channel": [], "district": [], "state": []}, "2": {}, "3": {}}', '{"data": [{"checkedRows": ["0002,Central", "0003,East"]}, {"meta": {"search": [{"column": "store_code", "pattern": "0004,0005"}], "range": []}, "checkAll": true}], "unique_columns": ["store_code","district"]}')
 	 *
 	 * Created_by      Created_on    Purpose
 	 * ----------       -----------   --------
 	 * Akshay Jain		27-sept-2022  If user performs select-all operation it returns data which is selected by user based on all transactions executed
 	 * 
 	 * Updated By      Updated_on    Purpose
 	 * ----------       -----------   --------
 	 * Akshsy Jain		4th-oct-2022  Refcursor based SPs support added
 	 * Chaitanya Prasad 16th-Aug-2023 To suppport pagination and return count							
 	 */
 	begin
 		
 		drop table if exists test_table_set_all;
 		drop table if exists test_table_set_all_view;
 		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
 			--_value := REGEXP_REPLACE(_value, $$([^'])'([^'])$$, $$\1''\2$$ ,'g');
 			_value := replace(_value,'''','''''');
 			input_arg := array_append(input_arg, ''''||_value::text||'''');
 		end loop;
 		
 		_input_arg_str := ARRAY_TO_STRING(input_arg, ',', '');
 	
 		_unique_column_list := replace(replace($3::json->>'unique_columns', '[', '{'), ']', '}');
 		_unique_column_str := ARRAY_TO_STRING(_unique_column_list, ',', '');
 	
 		if ($3::json->>'return_columns') is not null then	
 			_return_column_list := replace(replace($3::json->>'return_columns', '[', '{'), ']', '}');
 		else
 			_return_column_list := _unique_column_list;
 		end if;
 	
 		foreach _key in array _return_column_list loop
 		
 			_attribute_json_build_column_for_return := array_append(array_append(_attribute_json_build_column_for_return, ''''||_key||''''),'X.'|| _key ||'');
 	
 		end loop;
 	
 		if $4 is true then
 			
 			query := 'select * from ' || $1  || '(' ||  _input_arg_str || ')';
 			execute query into _refcursor_sp_query;			
 			query := 'create temp table test_table_set_all as select * from ( ' ||  _refcursor_sp_query || ' ) temp';
 			execute query;	
 		else
 			query := 'create temp table test_table_set_all as select * from ' || $1  || '(' ||  _input_arg_str || ')';
 			execute query;
 			SELECT column_name into _column_name FROM information_schema.columns WHERE table_name='test_table_set_all' and column_name='attributes';
 			
 		end if;
 		
 		
 		if _column_name is not null then
 		
 			sql_query := (
		        'SELECT string_agg(' ||
		            'CASE ' ||
		                'WHEN val IN (''text'', ''varchar'', ''character varying'', ''numeric'') ' ||
		                'THEN format(''attributes->>''''%s'''' "%s"'', key, key) ' ||
						'WHEN val in (''ARRAY'') ' ||
						'THEN format(''array(SELECT jsonb_array_elements_text((attributes->''''%s'''')::jsonb)) AS "%s"'', key, key) ' ||
		                'ELSE format(''attributes->>''''%s'''' "%s"'', key, key) ' ||
		            'END, '','') ' ||
		        'FROM ( ' ||
		            'SELECT DISTINCT key, tmp2.data_type as val ' ||
		            'FROM test_table_set_all tmp, json_each(attributes) ' ||
		                'LEFT JOIN ( ' ||
		                    'SELECT DISTINCT column_name AS key, data_type ' ||
		                    'FROM information_schema.columns ' ||
		                    'WHERE table_name IN (''product_attributes_filter'', ''store_attributes_filter'') ' ||
		                ') tmp2 USING (key) ' ||
		        ') s;'
		    );

			execute sql_query into s;
	 	    	
 	    
 	    	if s is not null then
 	    
	 	    	execute format('
	 				create temp table test_table_set_all_view as 
	         		select *,concat_ws('','', %s) as unique_set from ( select *,false as is_selected, %s from test_table_set_all) temp', _unique_column_str, s);
		         else
		         	execute format('
	 				create temp table test_table_set_all_view as 
	         		select *,concat_ws('','', %s) as unique_set from ( select *,false as is_selected from test_table_set_all) temp', _unique_column_str);
	         	
	          end if;	
         else
         	execute format('
 				create temp table test_table_set_all_view as 
         		select *,concat_ws('','', %s) as unique_set from ( select *,false as is_selected from test_table_set_all) temp', _unique_column_str);
 	    
 	    end if;
 	   	
     	
        	drop table if exists test_table_set_all;
        
        
        select count(*)  from test_table_set_all_view limit 1 into _count_temp_table;
       
       
       if _count_temp_table > 0 then
        
         
        for _filter in SELECT * FROM json_array_elements(($3::json->>'data')::json) loop
 	       
 	       if _filter::json->'meta' is not null then
 	       
 	       		if _filter::json->'checkAll' is not null then
 	       		
 	       		_check_uncheck_status = true;
 	       		
 	       		elseif _filter::json->'unCheckAll' is not null then
 	       		
 	       		_check_uncheck_status = false;
 	       		
 	       		end if;
 	       		_update_query := 'update test_table_set_all_view set is_selected = ' || _check_uncheck_status || ' ' || global.form_table_query((_filter::json->'meta')::jsonb);
 	       		execute _update_query;
 	       
 	       end if;
 	      
 	      if _filter::json->'checkedRows' is not null then
 	       		_update_query := 'update test_table_set_all_view set is_selected = true where unique_set = any(''' || replace(replace((_filter::json)->>'checkedRows', '[', '{'), ']', '}''') || ')'; 
 	       		execute _update_query;
 	       end if;
 	      
 	      
 	      if _filter::json->'unCheckedRows' is not null then
 	       		_update_query := 'update test_table_set_all_view set is_selected = false where unique_set = any(''' || replace(replace((_filter::json)->>'unCheckedRows', '[', '{'), ']', '}''') || ')';
 	       		execute _update_query;
 	       		
 	       end if;
        end loop;
      end if;

	  if ($3::json->>'meta')::json is not null then
		  where_clause := ' where is_selected is true ' || global.form_table_query(($3::json->'meta')::jsonb);
	  else
		  where_clause := ' where is_selected is true';
	  end if;

	  raise notice '%', where_clause;
	
	  if ($3::json->>'fetch_count')::json is not null and ($3::json->>'fetch_count')::bool is true then
		  RETURN QUERY execute 'select json_build_object(' || array_to_string(_attribute_json_build_column_for_return, ' ,') ||', ''row_count'', (select count(*) from test_table_set_all_view X where is_selected is true)) from test_table_set_all_view X' || where_clause;
	  else
		  RETURN QUERY execute 'select json_build_object(' || array_to_string(_attribute_json_build_column_for_return, ' ,') ||') from test_table_set_all_view X' || where_clause;
	  end if; 
       
 	
 	end $function$
;

