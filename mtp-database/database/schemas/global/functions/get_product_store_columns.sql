--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:get_product_store_columns stripComments:false splitStatements:false runOnChange:true context:v1.0 labels:JIRA_NO 
--comment Add comment describing your change
DROP FUNCTION IF EXISTS global.get_product_store_columns(input text, out _product_columns text, out _store_columns text);
CREATE OR REPLACE FUNCTION global.get_product_store_columns(input text, out _product_columns text, out _store_columns text)
 RETURNS record
 LANGUAGE plpgsql
AS $function$ 
declare
	_input_table_name text := $1;
	col_rec record;
begin
	_product_columns := '';
	_store_columns := '';
    -- Loop through columns of the input table
	for col_rec in 
		select tcm.column_name from global.table_configurations_mapping tcm 
		join global.table_configurations tc using (tc_code) where name = _input_table_name
	loop 
		
		if exists (
			select 1 from information_schema.columns where table_name = 'product_attributes_filter' and column_name = col_rec.column_name
		) then 
			_product_columns := _product_columns || col_rec.column_name || ',';
		elseif exists (
			select 1 from information_schema.columns where table_name = 'store_attributes_filter' and column_name = col_rec.column_name
		) then 
			 _store_columns := _store_columns || col_rec.column_name || ',';
		end if;
	end loop;
	-- Remove trailing comma if present
	IF length(_product_columns) > 0 THEN
        _product_columns := substring(_product_columns FROM 1 FOR length(_product_columns) - 1);
    ELSE
    	_product_columns := '*';
    END IF;
   -- Remove trailing comma if present
	IF length(_store_columns) > 0 THEN
        _store_columns := substring(_store_columns FROM 1 FOR length(_store_columns) - 1);
    ELSE
    	_store_columns := '*';
    END IF;
END;
$function$
;


 --rollback TYPE YOUR ROL