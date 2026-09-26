-- liquibase formatted sql
-- changeset zakia.firdous@impactanalytics.co:adding_sync_oms_order_cycle_cb_uat runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:adding the sp uat
-- comment: adding adding_sync_oms_order_cycle_cb_uat

DROP PROCEDURE IF EXISTS public.sync_oms_order_cycle(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_order_cycle(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_order_cycle';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.oms_order_cycle
            where 
              true;
        end if;
INSERT INTO inventory_smart.oms_order_cycle
	(product_code,
	vendor_code, 
	fiscal_year_week, 
	order_placement_date)
SELECT 
	src.product_code, 
	src.vendor_code, 
	src.fiscal_year_week, 
	src.order_placement_date
FROM public.oms_order_cycle AS src
ON CONFLICT (product_code, vendor_code, fiscal_year_week, order_placement_date)
DO NOTHING;
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
