--liquibase formatted sql
--changeset saad.adeeb:sync_ph_config_inactive runOnChange:true stripComments:false splitStatements:false context:MTP-44413 labels:MTP-44413
--comment: sync_ph_config_inactive initial commit
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_ph_config_inactive();
CREATE OR REPLACE PROCEDURE public.sync_ph_config_inactive()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_ph_config_inactive';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
insert into inventory_smart.ph_configuration_mapping
select * from inventory_smart.ph_configuration_mapping_inactive pcmi 
where (ph_code,channel)
in 
(select ph_code,channel from inventory_smart.ph_master);
delete  from inventory_smart.ph_configuration_mapping_inactive pcmi 
where (ph_code,channel)
in 
(select ph_code,channel from inventory_smart.ph_master);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;