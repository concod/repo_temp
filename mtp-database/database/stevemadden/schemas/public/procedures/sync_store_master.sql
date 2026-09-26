--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:sync_store_master runOnChange:true stripComments:false splitStatements:false context:Intial commit labels:sync_store_master
--comment: initial changeset for sync_store_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_master();
CREATE OR REPLACE PROCEDURE public.sync_store_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_attr text;
 		_update_attr text;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		select
 			string_agg('"' || generic_column_name || '"', ', '),
 			string_agg('"' || generic_column_name || '" = excluded."' || generic_column_name || '"', ', ')
 			into _attr, _update_attr
 		from
 			"global".store_generic_schema_mapping pgsm
 		where
 			required_in_product
 			and not is_attribute;
 		update
 			global.store_master
 		set
 			active = false,
 			is_deleted = true
 		where
 			store_code  in (
 			select
 				store_code
 			from
 				public.store_validated_table svt
 			where active =false
 		and svt.close_date <= current_date);
 		execute 'insert
 			into
 			global.store_master (' || _attr || ')
 		select
 			' || _attr || '
 		from
 			public.store_validated_table
 			on conflict (store_code) do
 		update
 		set
 			' || _update_attr || ';'; 
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
