--liquibase formatted sql
--changeset poojith.krishna@impactanalytics.co:sync_oms_constraints_lead_time runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_oms_constraints_lead_time

DROP PROCEDURE IF EXISTS public.sync_oms_constraints_lead_time(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_lead_time(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_lead_time';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              inventory_smart.oms_constraints_lead_time 
            where 
              true;
        end if;
  insert into inventory_smart.oms_constraints_lead_time
      (
article,
loc_code,
channel,
vendor_code,
vendor_name,
po_to_order_processing,
lead_time,
shipping_lead_time,
manufacturing_lead_time,
mode_shipment,
default_mode,
from_date,
to_date,
created_by,
created_at,
updated_by,
updated_at,
fabric_lt,
qc_time
      )
  select
       
article,
loc_code,
channel,
vendor_code,
vendor_name,
po_to_order_processing,
lead_time,
shipping_lead_time,
manufacturing_lead_time,
mode_shipment,
default_mode,
from_date,
to_date,
3 AS created_by,
now() AS created_at,
null as updated_by,
null AS updated_at,
fabric_lt,
qc_time
  from
    --public.oms_kpi
    public.oms_constraints_lead_time
  on conflict ON CONSTRAINT pk_oms_constraints_lead_time do update 
  set
      	po_to_order_processing = excluded.po_to_order_processing,
		lead_time = excluded.lead_time;


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