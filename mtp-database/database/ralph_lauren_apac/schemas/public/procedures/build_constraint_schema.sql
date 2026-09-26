--liquibase formatted sql
--changeset ashish@impactanalytics.co:build_constraint_schema runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: initial changeset for build_constraint_schema
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.build_constraint_schema();
CREATE OR REPLACE PROCEDURE public.build_constraint_schema()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.build_constraint_schema';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	perform global.create_drop_index_list_ingestion('inventory_smart', 'constraint_master', false);
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
