--liquibase formatted sql
--changeset kamalesh.k:create_table_version stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_table_version

DROP FUNCTION IF EXISTS public.create_table_version;
CREATE OR REPLACE FUNCTION public.create_table_version(tbl_name text)
 RETURNS TABLE(main_table_name character varying, version_table_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
	table_name_ text ;
	schema_ text;
	_sql text;
	r RECORD;
	partition_column text;
	strategy text;
	_version int;
	tbl text;
	missing_tbl text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.create_table_version';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_worker text;
BEGIN

	
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
		 main_table_name varchar,version_table_name varchar
		);
		CREATE TEMP TABLE input_details AS 
		SELECT SUBSTRING(unnest_value,1,POSITION('.' IN unnest_value)- 1) as schema,
			   CONCAT(REVERSE(SUBSTRING(REVERSE(unnest_value), 1,POSITION('.' IN REVERSE(unnest_value))- 1)),'_version') AS tbls
		FROM   UNNEST(string_to_array(tbl_name,',')) as unnest_value;

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'Validate input tables exist';
		PERFORM set_config('local.log_step', _log_step, true);
		
		SELECT  string_agg(concat(schema,'.',REPLACE(tbls,'_version','') ),',')
		FROM 	input_details  idt
		WHERE 	NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = idt.schema AND t.table_name = idt.tbls) 
		into missing_tbl ;

		   -- If there are missing tables, raise an exception
	    IF missing_tbl IS NOT NULL THEN
		
	        RAISE EXCEPTION 'Incorrect tables are passed % .Please correct it and try again!', missing_tbl;
			
	    END IF;

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
	
		FOR schema_, table_name_ IN SELECT schema, tbls FROM input_details
		LOOP

			DROP TABLE IF EXISTS partition_details;

			_log_step := 'creating table version:'||table_name_  ;
			PERFORM set_config('local.log_step', _log_step, true);
		
			INSERT INTO global.versioning (tbl_name) VALUES( schema_ ||'.'||table_name_  ) returning version_code into _version;
			RAISE NOTICE '_version: %', _version;
				
			tbl := table_name_||'_'||_version;
		
			UPDATE global.versioning
			SET new_tbl_name = schema_ ||'.'||table_name_||'_'||_version
			WHERE version_code = _version;

			INSERT INTO output_details (main_table_name,version_table_name)
			VALUES ( schema_ ||'.'||table_name_,schema_ ||'.'||table_name_||'_'||_version);
			
			SELECT
			col.column_name as table_partition_column,
			partition_strategy
			into partition_column,strategy
			FROM (	SELECT partrelid,partnatts, 
						   CASE partstrat WHEN 'l' THEN 'LIST' WHEN 'r' THEN 'RANGE' END AS partition_strategy,
						   UNNEST(partattrs) column_index
					FROM	pg_partitioned_table
				  ) pt 
			JOIN  pg_class par ON  par.oid = pt.partrelid
			JOIN  information_schema.columns col ON  col.table_schema = par.relnamespace::regnamespace::text and col.table_name = par.relname 
					and ordinal_position = pt.column_index
			WHERE table_name = table_name_;
		
			-- table cloning...
			_sql := 'CREATE TABLE IF NOT EXISTS '||schema_ ||'.'||tbl||' (LIKE ' ||schema_ ||'.'||table_name_|| ' INCLUDING ALL) '  
					  || CASE WHEN partition_column is not null  AND strategy = 'LIST' AND partition_column NOT LIKE '%version_code%'
					  	THEN ' PARTITION BY LIST ('|| partition_column || ') ;' 
					  ELSE ' ;' END ;

			
			RAISE NOTICE 'table_clone... : % ', _sql;
--			EXECUTE _sql ;
select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
perform dblink_get_result(_worker);
perform dblink_disconnect(_worker);

			_sql := ' ALTER TABLE  '||schema_ ||'.'||tbl||' ALTER COLUMN version_code SET DEFAULT ('||_version||');' ;
			RAISE NOTICE 'default constraint... : % ', _sql;
--			EXECUTE _sql ;

select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
perform dblink_get_result(_worker);
perform dblink_disconnect(_worker);

		    CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
			
		END LOOP;

		_sql := 'SELECT * FROM output_details';
		
		CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
			
		RETURN QUERY execute _sql;

	EXCEPTION
	
		WHEN OTHERS THEN
	        -- Log the error if an exception occurs during any part of the function
	        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the function: %', SQLERRM;
	END;
	
END;
$function$
;
