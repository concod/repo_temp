--liquibase formatted sql
--changeset akshay.jain@impact:store_product_mapping_list_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:store_product_mapping_list_2
--comment: updated function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_product_mapping_list(input refcursor, jsonb, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_projection_cols text[] := array['store_name', 'store_description']::text[];
	_key text;
	_value text;
	_final_query text;
	begin
		_query_sm := 'SELECT store_code FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
	
		foreach _key in array _projection_cols loop
			
			if not $3 ? _key then
            -- Add the key with an empty list if it's missing
            $3 := $3 || jsonb_build_object(_key, '[]');
			
           	end if;
		end loop;
 		_query_sa := "global".form_attribute_table_filters_v3('store_attributes', 'store_code', $3);
 		raise notice 'sa query %',_query_sa ;
 		for _key, _value in select * from jsonb_each_text($3) loop
			continue when _key in ('store_group', 'store_code');
			_projection_cols := array_append(_projection_cols, _key);
 		end loop;

		_query_table_filters := "global".form_table_query($4);
		/*
		_query_combine := 'SELECT * FROM (
			SELECT X.store_code, ' || array_to_string(_projection_cols, ', ', '') || ' 
			FROM 
			(
				select
					attributes.store_code
				from
				(' || _query_sa || ') attributes
			) X 
			join global.store_attributes_filter saf
			on X.store_code = saf.store_code ) Y
		' || _query_table_filters;
		*/
	
		_query_combine := 'select * from (' || _query_sa || ') X ' || _query_table_filters;
			
	
		if $5 is true then
			_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
		else
			_final_query := _query_combine;
		end if;
		raise notice 'final query %', _final_query;
		open $1 for execute _final_query;
		RETURN _final_query;
 	end
$function$
;
