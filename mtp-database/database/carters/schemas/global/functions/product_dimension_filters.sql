--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:MTP-95247 runOnChange:true stripComments:false splitStatements:false context:MTP-95247 labels:MTP-95247
--comment: looping over filters instead of attributes for check_configuration
--rollback: SELECT 1

DROP FUNCTION if exists global.product_dimension_filters(input refcursor, character varying[], jsonb);
CREATE OR REPLACE FUNCTION global.product_dimension_filters(input refcursor, character varying[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
 Returns aggregated distinct values for product attributes sent in $2
 Calling Statement: 
 	 select * from global.product_dimension_filters('abc','{"l0_name","l2_name"}', 
 	'{"l0_name": []}')
  */
	declare
	_query text := '';
	_projection_queries text[];
	_col text;
    _attr_obj jsonb;
	_check_config jsonb;
	_check_config_val jsonb;
	_res jsonb;
	_res_item jsonb;
    _res_array text[] := '{}';
    _temp text;
    _sp_input_arg text;
    _projection_queries2 TEXT[]; 
    _query2 text := '';
    query_pa text := '';
    
	begin
		
		foreach _col in array $2 loop
			if _col = 'sub_styles' then 
			_projection_queries2 := array_append(
				_projection_queries2, 
				'unnest (' || _col || ') as ' || _col || '');
			else
			
			_projection_queries2 := array_append(
				_projection_queries2, 
				_col || ' as ' || _col );
			
			end if;
			
		end loop;
		
		foreach _col in array $2 loop
			_projection_queries := array_append(
				_projection_queries, 
				'array_agg(distinct ' || _col || ') as ' || _col || '');
		end loop;
 		
 		FOR _col IN SELECT jsonb_object_keys($3) LOOP
		    _check_config := jsonb_extract_path($3, _col);
		    for _attr_obj in select * from jsonb_array_elements(_check_config) loop
		    	_check_config_val := _attr_obj->>'check_configuration';
		    	if _check_config_val is not null then
				    _attr_obj = _attr_obj - 'check_configuration';
		    		_sp_input_arg := '{"0": {}, "1": {"cols": "' || _col || '"}, "2": {"' || _col || '": ' || jsonb_build_array(_attr_obj) || '}}';
					_query := format('SELECT json_agg(result) FROM (SELECT * FROM global.select_all_transactions(%L, %L, %L,true)) AS result',
                  	'global.product_dimension_filters_select_all',
                  	_sp_input_arg,
                  	'{"data":' || coalesce(_check_config_val::text, '[]') || ',"unique_columns":' || jsonb_build_array(_col) || '}'
                  	);
				   	execute _query INTO _res;
				   
				    for _res_item in select * from jsonb_array_elements(_res) loop
				        _temp := _res_item->'set_all_data'->>_col;
				    	_res_array := array_append(_res_array, _temp);
				    end loop;
				 	
				 	_res_item = jsonb_set(_attr_obj, '{values}', to_jsonb(_res_array));
				 	$3 := jsonb_set($3, array[_col],jsonb_build_array(_res_item));	
				 	_res_array := '{}';
				end if;
		    end loop;
		 end loop;
		
		raise notice ' dollar 3 - %',$3;
		_query := 'SELECT ' || array_to_string(_projection_queries, ', ') || '
          FROM (
              SELECT ' || array_to_string(_projection_queries2, ', ') || '
              FROM ('  ||
                  "global".form_attribute_table_filters_v2(
                      'product_attributes',
                      'product_code',
                      $3
                  )
              || ') AS X2
          ) AS X';
	
		/*
	
		query_pa := 'select * from (' || "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3) || ') Y';
		execute query_pa into query_pa;
		raise notice ' _query 1234 - %',query_pa;
		_query2 := 'select ' ||  _projection_queries2 || ' from (' || query_pa || ' ) X2';
		raise notice ' _query - %',_query2;
		/*
 		_query := 'select ' || ARRAY_TO_STRING(_projection_queries, ', ', '') || '
				 from (select ' ||  _projection_queries2 || ' from (' || ("global".form_attribute_table_filters_v2('product_attributes',
				'product_code', $3)) || ' ) X2 ) X';
 		 raise notice ' _query - %',_query;
		*/
		
		_query := 'select ' || ARRAY_TO_STRING(_projection_queries, ', ', '') || '
				 from (' || ("global".form_attribute_table_filters_v2('product_attributes',
				'product_code', $3)) || ' ) X';
		*/
    open $1 for execute _query;
 	RETURN $1;
	end
$function$
;