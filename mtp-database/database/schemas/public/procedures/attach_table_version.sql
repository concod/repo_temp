--liquibase formatted sql
--changeset azmath:attach_table_version stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:liquibase_project_start
--comment: update changeset for attach_table_version by ashish

DROP PROCEDURE IF EXISTS public.attach_table_version();
DROP PROCEDURE IF EXISTS public.attach_table_version(IN tbl_name text);

CREATE OR REPLACE PROCEDURE public.attach_table_version(IN tbl_name text)
 LANGUAGE plpgsql
AS $procedure$
declare
	_version int;
	new_tbl_name text;
	_sql text;
	table_name_ text ;
	schema_ text;
	missing_tbl text;
	_log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.attach_table_version';
 	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_worker text;
BEGIN

	DROP TABLE IF EXISTS input_details;
	
	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	PERFORM set_config('local.log_code', _log_code, true);
	PERFORM set_config('local.sp_name', _sp_name, true);

	BEGIN

		_log_step := 'Get input details';
		PERFORM set_config('local.log_step', _log_step, true);
		
		CREATE TEMP TABLE input_details AS 
		SELECT SUBSTRING(unnest_value,1,POSITION('.' IN unnest_value)- 1) as schema,
			   CONCAT(REVERSE(SUBSTRING(REVERSE(unnest_value), 1,POSITION('.' IN REVERSE(unnest_value))- 1)),'_version') AS tbls
		FROM   UNNEST(string_to_array(tbl_name,',')) as unnest_value;

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'Get invalid tables';
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

		_log_step := 'Attach patitions';
		PERFORM set_config('local.log_step', _log_step, true);
		
		SELECT string_agg('ALTER TABLE '||a.schema ||'.'||a.tbls ||' ATTACH PARTITION '|| a.new_tbl_name || ' FOR VALUES IN(' || a.version_code || ')'
				,' ; ')
		FROM ( select v.new_tbl_name,d.schema,d.tbls,MAX(v.version_code) as version_code
				FROM global.versioning v
				inner join input_details d on v.tbl_name= d.schema||'.'||d.tbls 
				WHERE updated_at is null
				group by v.new_tbl_name,d.schema,d.tbls
			  ) a
		WHERE NOT EXISTS ( 	SELECT  1 
							FROM pg_inherits
							JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
							JOIN pg_namespace n_parent ON parent.relnamespace = n_parent.oid
							JOIN pg_class child ON pg_inherits.inhrelid = child.oid
							WHERE parent.relkind = 'p' AND n_parent.nspname = a.schema
						    AND child.relname = concat(a.tbls,'_',version_code)
						 )
		INTO _sql;
		RAISE NOTICE 'Adding partition: %', _sql;
		
--		EXECUTE _sql;
select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _sql || ''');');
perform dblink_get_result(_worker);
perform dblink_disconnect(_worker);

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'update version table';
		PERFORM set_config('local.log_step', _log_step, true);
		
		--updating global.versioning
		UPDATE global.versioning AS gv
		SET updated_at = now()
		FROM (
				SELECT v.new_tbl_name,d.schema,d.tbls,v.version_code 
				FROM global.versioning v
				INNER JOIN input_details d on v.tbl_name= d.schema||'.'||d.tbls 
				WHERE updated_at is null
			) v
		WHERE gv.version_code = v.version_code AND v.new_tbl_name = gv.new_tbl_name ;

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null,  (clock_timestamp() - _st)::text, null);
		
	EXCEPTION
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;
	
END;
$procedure$
;
