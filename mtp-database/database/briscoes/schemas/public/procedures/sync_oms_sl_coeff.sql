--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:sync_oms_sl_coeff runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_sl_coeff
--comment: initial changeset sync_oms_sl_coeff 

DROP PROCEDURE IF EXISTS public.sync_oms_sl_coeff();

CREATE OR REPLACE PROCEDURE public.sync_oms_sl_coeff()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_sl_coeff';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

delete from inventory_smart.oms_sl_coeff where true;

INSERT INTO inventory_smart.oms_sl_coeff
    (service_level,
    coeff)
SELECT 
    service_level,
    coeff
FROM public.oms_sl_coeff osc;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;