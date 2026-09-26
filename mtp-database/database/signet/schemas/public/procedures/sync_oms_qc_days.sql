--liquibase formatted sql
--changeset liquibase:sync_oms_qc_days runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_qc_days
DROP PROCEDURE IF EXISTS public.sync_oms_qc_days();
CREATE OR REPLACE PROCEDURE public.sync_oms_qc_days(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_qc_days';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
             delete from 
               inventory_smart.oms_qc_days
             where 
               true;
         end if;
   insert into inventory_smart.oms_qc_days
       (product_code,
        vendor_code,
        dc_id,
		vlt_week,
		qc_days
       )
   select
        product_code,
        vendor_code,
        dc_id,
		vlt_week,
		qc_days
	from (
	select *,fdm.fiscal_year_week as vlt_week,(eff_lead_time_date-vlt_date) as qc_days
	from public.oms_effective_lead_time oelt 
	join global.fiscal_date_mapping fdm on oelt.vlt_date=fdm.calendar_date
	) X;
 
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
