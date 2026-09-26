--liquibase formatted sql
--changeset ajun.ravi@impactanalytics.co:sort_related_changes runOnChange:true stripComments:false splitStatements:false context:store attributes labels:MTP-23273
--comment: Sort related changes for capacity configuration - Ajun Ravi | MTP-25519
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.generate_sort_clause(input jsonb, table_name varchar, schema varchar);
CREATE OR REPLACE FUNCTION inventory_smart.generate_sort_clause(input jsonb, table_name character varying, schema character varying)
 RETURNS TEXT
 LANGUAGE plpgsql
AS $function$ 
/*
Function to generate form sort clause based on parameter from backend
Calling statement:
SELECT * from inventory_smart.generate_sort_clause(
	"sort": [{"column": "column_name", "order": "asc/desc" }]
)
*/
DECLARE
	_key text;
	_val text;
	_filter text;
   	_sort_text text:= '';
 	_tbl_fields text[];
 	_order_txt text := '';
 	_column text := '';
 
	BEGIN 
		
		_tbl_fields := (select * from inventory_smart.get_columns($2, $3))::text[];

		FOR _key, _val IN SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL LOOP
          IF _key = 'sort' then
          	 FOR _filter IN SELECT * FROM json_array_elements(_val::json) 
			 	LOOP
					raise notice 'order filtere: %', (_filter::json)->>'order';
					_order_txt := (_filter::json)->>'order';
					_column := (_filter::json)->>'column';
					if _column = ANY(_tbl_fields) then
						_column := _column||' '||_order_txt;
						_sort_text := _sort_text||_column||',';
					end if;
				end LOOP;
				if length(_sort_text)>0 then
				_sort_text := substring(_sort_text, 1, length(_sort_text) - 1);
				end if;
			end if;
		END LOOP;
	
		if length(_sort_text) > 0 then
			_sort_text := ' ORDER BY ' || _sort_text;
			 else
			_sort_text := ' ';
		end if;
 		raise notice '_sort_text%',_sort_text;
 		
 		return _sort_text;
	end;
$function$
;
