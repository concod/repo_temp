--liquibase formatted sql
--changeset himansh.bhardwaj:get_pk_columns stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_pk_columns

DROP FUNCTION IF EXISTS public.get_pk_columns();

CREATE OR REPLACE FUNCTION public.get_pk_columns(tbl_name text)
RETURNS TABLE(table_name character varying, pk_column_name character varying) 
LANGUAGE 'plpgsql'
AS $function$
DECLARE
	_sql text;
	-- Logging variables
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.get_pk_columns';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN

	-- Start logging
	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	PERFORM set_config('local.log_code', _log_code, true);
	PERFORM set_config('local.sp_name', _sp_name, true);

	BEGIN
		_log_step := 'Initialize temp tables and process input';
		PERFORM set_config('local.log_step', _log_step, true);
		
		DROP TABLE IF EXISTS input_details;
		DROP TABLE IF EXISTS output_details;
		
		CREATE TEMP TABLE output_details
		(
		 table_name varchar,pk_column_name varchar
		);
		CREATE TEMP TABLE input_details AS 
		SELECT SUBSTRING(unnest_value,1,POSITION('.' IN unnest_value)- 1) as schema,
			   REVERSE(SUBSTRING(REVERSE(unnest_value), 1,POSITION('.' IN REVERSE(unnest_value))- 1)) AS tbls
		FROM   UNNEST(string_to_array(tbl_name,',')) as unnest_value;

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'Extract primary key information from system catalogs';
		PERFORM set_config('local.log_step', _log_step, true);
		
		INSERT INTO output_details(table_name,pk_column_name)
		WITH constraints 
		AS (
		    	SELECT 	n.nspname AS schema_name,t.relname AS _table_name,con.conname AS constraint_name,
		        		con.contype AS constraint_type,a.attname AS column_name,
		        		dense_rank() OVER (PARTITION BY n.nspname, t.relname ORDER BY CASE con.contype WHEN 'p' THEN 1 WHEN 'u' THEN 2 ELSE 3 END ) AS constraint_rank
		    FROM pg_constraint con
		    JOIN pg_class t ON t.oid = con.conrelid
		    JOIN pg_namespace n ON n.oid = t.relnamespace
		    JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
		    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
		    WHERE EXISTS (SELECT 1 FROM input_details d WHERE d.schema = n.nspname and d.tbls = t.relname)
				  AND con.contype IN ('p', 'u') 
		)
		SELECT concat(schema_name,'.',_table_name) AS tbl,string_agg(column_name,',') as pk_columns
		FROM constraints
		WHERE constraint_rank = 1
		group by schema_name,_table_name;

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'Prepare and return results';
		PERFORM set_config('local.log_step', _log_step, true);
		
		_sql := 'SELECT * FROM output_details';
		
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
		CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
		
		RETURN QUERY execute _sql;

	EXCEPTION
		when others then
	        -- Log the error if an exception occurs during any part of the function
	        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the function: %', SQLERRM;
	END;
	
END;
$function$;