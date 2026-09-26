--liquibase formatted sql
--changeset poojith.krishna@impactanalytics.co:sync_oms_constraints_safety_stock runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_oms_constraints_safety_stock

DROP PROCEDURE IF EXISTS public.sync_oms_constraints_safety_stock(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_safety_stock(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_safety_stock';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              inventory_smart.oms_constraints_safety_stock 
            where 
              true;
        end if;
  insert into inventory_smart.oms_constraints_safety_stock
      (
article,
channel,
loc_code,
vendor_code,
vendor_name,
safety_stock_method,
safety_stock_twos,
demand_twos,
service_level_pct,
stock_units,
created_by,
created_at,
updated_by,
updated_at
      )
  select
       
article,
channel,
loc_code,
vendor_code,
vendor_name,
safety_stock_method,
safety_stock_twos,
demand_twos,
service_level_pct,
stock_units,
3 as created_by,
now() as created_at,
null as updated_by,
null as updated_at
  from
    --public.oms_kpi
    public.oms_constraints_safety_stock
  on conflict ON CONSTRAINT pk_oms_constraints_safety_stock do update 
  set
      safety_stock_method = excluded.safety_stock_method,
      safety_stock_twos = excluded.safety_stock_twos,
      demand_twos = excluded.demand_twos,
      service_level_pct = excluded.service_level_pct;

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
