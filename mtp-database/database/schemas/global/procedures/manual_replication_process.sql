--liquibase formatted sql
--changeset ashish@impactanalytics.co:manual_replication_process runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for manual_replication_process
DROP PROCEDURE IF EXISTS global.manual_replication_process(IN _tbl_list text[]);
CREATE OR REPLACE PROCEDURE global.manual_replication_process(IN tbl_list text[])
 LANGUAGE plpgsql
AS $procedure$
--DO $$ 
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.manual_replication_process';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _tablename text;
    _cols text;
	_ex_cols text;
	_sou_cols text;
	_des_cols text;
	_dt_cols text;
	_pk_cols text;
   	_sql text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Loop over input table names
    FOR _tablename IN select unnest(tbl_list)
    LOOP
	
        -- Get all columns
        SELECT  string_agg('"' || c.column_name ||'"', ', ' order by c.column_name) ,
				string_agg('excluded."' || c.column_name ||'"', ', ' order by c.column_name) 
		into _cols,_ex_cols
        FROM information_schema.columns c 
        WHERE c.table_name = _tablename AND c.table_schema = 'global';

		-- Get primary key columns
        SELECT string_agg( '"' || kcu.column_name || '"', ', 'order by kcu.column_name ),
			   string_agg('sou."' || kcu.column_name || '"', ', ' order by kcu.column_name ) ,
				 string_agg('des."' || kcu.column_name || '"', ', ' order by kcu.column_name ) ,
			   string_agg('dt."' || kcu.column_name || '"', ', ' order by kcu.column_name )
		INTO _pk_cols,_sou_cols,_des_cols,_dt_cols
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
        WHERE tc.table_name = _tablename
          AND tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'global';

/* ++++++++++++++++++++++++++++ Delete ++++++++++++++++++++++++++++++++++++++ */
		-- Construct delete SQL
		_sql :=  'DELETE FROM global.' || _tablename || ' as des 
		 		   WHERE EXISTS (SELECT 1 
								 FROM inventory_global.' || _tablename || '_delta dt 
								 {where}  
								 AND (' || _des_cols || ') = (' || _dt_cols || ') 
								 AND dt.action_type in (''delete'') 
								 )';

		raise notice '_sql: %', _sql;
		
		  -- parellel_delete
		perform public.parellel_insert('WITH rows AS (
				' || _sql || '
				RETURNING 1
			) 
			SELECT count(1) as cnt FROM rows;', 50, 'inventory_global.' || _tablename || '_delta', 'serial_no', _tablename || '_idx', 5000);

		_sql := '' ;

/* ++++++++++++++++++++++++++++ Insert & Update ++++++++++++++++++++++++++++++++++++++ */

        -- Construct insert & update SQL
        _sql := ' INSERT INTO  global.' || _tablename || '(' || _cols || ')
            SELECT ' || _cols || ' 
			FROM inventory_global.' || _tablename || '  sou
			WHERE EXISTS (SELECT 1 
						  FROM inventory_global.' || _tablename || '_delta dt 
						  {where}  AND (' || _sou_cols || ') = (' || _dt_cols || ') 
						  AND dt.action_type in (''insert'',''update'') 
						  )
			ON CONFLICT (' || _pk_cols || ' ) DO 
			UPDATE
			SET (' || _cols || ' ) = (' || _ex_cols || ' ) ';

		raise notice '_sql: %', _sql;

		-- parellel_insert
		perform public.parellel_insert('WITH rows AS (
				' || _sql || '
				RETURNING 1
			) 
			SELECT count(1) as cnt FROM rows;', 50, 'inventory_global.' || _tablename || '_delta', 'serial_no', _tablename || '_idx', 5000);

    END LOOP;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
