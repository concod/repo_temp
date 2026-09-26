--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co:1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for sourcesmart_hierarchies
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.sourcesmart_hierarchies(refcursor, jsonb, character varying);
CREATE OR REPLACE FUNCTION global.sourcesmart_hierarchies(input refcursor, jsonb, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	_where_clause text := '';
	_column_name text;
	_filter_array jsonb;
	_filter jsonb;
	_operator text;
	_values jsonb;
	_values_text text;
	_i int;
	result record;
	begin
 		-- New input format: {"l0_name": [...], "vendor_group": [...], "category": [...]}
 		-- $3 is comma-separated columns: 'l0_name,vendor_group,category'
 		-- We need to process each column and its filter array
 		
 		raise notice ' input json: %', $2;
 		raise notice ' requested columns: %', $3;
 		
 		-- Start with empty WHERE clause
 		_where_clause := '';
 		
 		-- Only process l0_name filters since we're fetching from global.product_attributes_filter
 		IF $2 ? 'l0_name' THEN
 			_filter_array := $2->'l0_name';
 			
 			-- Process each filter in the l0_name array
 			FOR _i IN 0..jsonb_array_length(_filter_array) - 1 LOOP
 				_filter := _filter_array->_i;
 				_operator := _filter->>'operator';
 				_values := _filter->'values';
 				
 				-- Convert values array to text representation
 				_values_text := _values::text;
 				
 				-- Build WHERE clause for this filter
 				IF _where_clause != '' THEN
 					_where_clause := _where_clause || ' AND ';
 				END IF;
 				
 				IF _operator = 'in' THEN
 					_where_clause := _where_clause || 'l0_name::varchar = any(''' || 
 						replace(replace(_values_text, '[', '{'), ']', '}') || '''::varchar[])';
 				ELSE
 					-- Handle other operators if needed
 					_where_clause := _where_clause || 'l0_name ' || _operator || ' ''' || _values_text || '''';
 				END IF;
 			END LOOP;
 		END IF;
 		
 		-- Add WHERE keyword if we have conditions
 		IF _where_clause != '' THEN
 			_where_clause := ' WHERE ' || _where_clause;
 		END IF;
 		
 		raise notice ' generated where clause: %', _where_clause;
 		
 		-- Build the final query - return l0_name, vendor_group, and category (same values)
 		_query := 'select concat(l0_name) as id, l0_name, l0_name as vendor_group, l0_name as category from global.product_attributes_filter' || _where_clause || ' group by l0_name, l0_name, l0_name order by l0_name';
	
		raise notice ' final query: %', _query;
		
		-- Execute query and show results in notices
		FOR result IN EXECUTE _query LOOP
			RAISE NOTICE 'RESULT: id=%, l0_name=%, vendor_group=%, category=%', result.id, result.l0_name, result.vendor_group, result.category;
		END LOOP;
		
		open $1 for execute _query;
		return $1;
	end $function$;