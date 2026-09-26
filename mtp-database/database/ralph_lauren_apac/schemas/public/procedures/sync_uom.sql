--liquibase formatted sql
--changeset liquibase:sync_uom runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_uom
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_uom();
CREATE OR REPLACE PROCEDURE public.sync_uom()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_uom';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.uom 
		where 
		  true;
		INSERT INTO inventory_smart.uom (
		  from_unit_description, factor, to_unit_description, 
		  item_id, from_unit, to_unit, "date"
		) 
		SELECT 
		  from_unit_description, 
		  factor, 
		  to_unit_description, 
		  item_id, 
		  from_unit, 
		  to_unit, 
		  "date" 
		FROM 
		  public.uom_latest;
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
