--liquibase formatted sql
--changeset liquibase:sync_generic_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_generic_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_generic_master(IN _table_name character varying, in _validated_table_name character varying);
CREATE OR REPLACE PROCEDURE public.sync_generic_master(IN _table_name character varying, in _validated_table_name character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_generic_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_attr text;
 		_mapping_table varchar;
 		_attrs_sql text;
 		_cleanup_sql text;
 		_insert_sql text;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		select
 			generic_mapping_table into _mapping_table
 		from
 			"global".generic_master_mapping
 		where
 			destination_table = _table_name;
 		_attrs_sql := 'select
 			string_agg(''"'' || generic_column_name || ''"'', '', '')
 		from
 			"global".' || _mapping_table || '
 		where
 			required_in_product
 			and not is_attribute';
 		raise notice '_attrs_sql: %', _attrs_sql;
 		execute _attrs_sql into _attr;
 		_cleanup_sql := 'delete
 		from
 			global.' || _table_name || '
 		where
 			true;';
 		raise notice '_cleanup_sql: %', _cleanup_sql;
 		execute _cleanup_sql;
 		_insert_sql := 'insert
 			into
 			global.' || _table_name || '(' || _attr || ')
 		select ' || _attr || '
 		from
 			public.' || _validated_table_name || ';';
 		raise notice '_insert_sql %', _insert_sql;
 		execute _insert_sql;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
 	end
$procedure$
;

