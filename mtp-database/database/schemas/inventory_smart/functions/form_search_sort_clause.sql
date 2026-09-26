--liquibase formatted sql
--changeset liquibase:form_search_sort_clause runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-20006
--comment: fix add page number
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.form_search_sort_clause(input jsonb, table_name varchar, schema varchar, OUT _ph_sort text, OUT _ph_search text, OUT _overall_search text, OUT _limit integer, OUT _offset integer, OUT _sub_limit integer, OUT _sub_offset integer);
CREATE OR REPLACE FUNCTION inventory_smart.form_search_sort_clause(input jsonb, table_name character varying, schema character varying, OUT _ph_sort text, OUT _ph_search text, OUT _overall_search text, OUT _limit integer, OUT _offset integer, OUT _sub_limit integer, OUT _sub_offset integer)
 RETURNS record
 LANGUAGE plpgsql
AS $function$ 
/*
Function to form search sort and limit clause based on parameter from backend
Calling statement:
SELECT * from inventory_smart.form_search_sort_clause(
	'{"search": [{"column_name": " column_name ~* '.*search_value.*'"}], 
	"sort": [{"column": "column_name", "order": "asc/desc" }], 
	"limit": {"limit": 100, "offset": 0}}', 'table_name', 'schema_name'
)
*/
DECLARE
	_key text;
	_val text;
	_filter text;
	_ph_sort_arr text[] := '{}';
    _ph_search_arr text[] := '{}';
    _overall_search_arr text[]:= '{}';
   	_sort_text text:= '';
	_sort_asc text[];
 	_sort_desc text[];
 	--_sort_text text[];
 	_filter_text text[];
 	_filter_comma text[];
 	_type_col text := 'str'; --by default type of column is str
 	_sort_query text := '';
 	_limit_query text := '';
 	_filter_query text := '';
 	_search_type text;
	BEGIN 
		_ph_sort = '';
		_ph_search = '';
		_overall_search = '';
		 FOR _key, _val IN SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL LOOP
          IF _key = 'sort' THEN
			 for _filter in select col ||' '||ord col_order 
					from (
					select value->>'column' as col , coalesce (value->>'order', 'asc')  as ord  from (
					 SELECT value  FROM  json_array_elements(_val::json) 
							)
						 X
						 ) Y loop
						_sort_text := _sort_text||_filter||',';
				end loop;
				
				if length(_sort_text)>0 then
				_sort_text := substring(_sort_text, 1, length(_sort_text) - 1);
				end if;
			end if;
			raise notice '_sort_text%',_sort_text;
            IF _key = 'search' THEN
				FOR _filter IN SELECT * FROM json_array_elements(_val::json) LOOP
                    IF (_filter::json)->>'column' = ANY((SELECT * FROM inventory_smart.get_columns($2, $3))::text[]) THEN
                        _ph_search_arr := array_append(_ph_search_arr, ( ' AND ' || ((_filter::json)->>'query')));
                    ELSE
                        _overall_search_arr := array_append(_overall_search_arr, ( ' AND ' || ((_filter::json)->>'query')));
                    END IF;
                END LOOP;
			END IF;
        	IF _key = 'limit' THEN
	            _limit = ((_val::json)->>'limit')::int;
				if ((_val::json)->>'page' is not null) and ((_val::json)->>'offset' is null) then
	            	_offset = _limit * (((_val::json)->>'page')::int - 1);
				else
					_offset = ((_val::json)->>'offset')::int;
				end if;
				_sub_limit = ((_val::json)->>'sub_limit')::int;
	            _sub_offset = ((_val::json)->>'sub_offset')::int;
			END IF;
		END LOOP;
	
		if length(_sort_text) > 0 then
			_sort_text := ' ORDER BY ' || _sort_text;
			 else
			_sort_text := ' ';
		end if;
 		raise notice '_sort_text%',_sort_text;
 		
 		if cardinality(_filter_text) > 0 then
 			_ph_search := (ARRAY_TO_STRING(_filter_text, ' AND ', ''));
 		end if;
 		_ph_sort := _sort_text;
 	
		_ph_search = (ARRAY_TO_STRING(_ph_search_arr, '', ''));
		_overall_search = (ARRAY_TO_STRING(_overall_search_arr, '', ''));

	end;
$function$
;