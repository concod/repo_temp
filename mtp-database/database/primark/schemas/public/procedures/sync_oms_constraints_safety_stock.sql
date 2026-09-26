-- liquibase formatted sql
-- changeset zakia.firdous@impactanalytics.co:sync_oms_constraints_safety_stock_cb_test runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_safety_stock
-- comment: initial changeset for sync_oms_constraints_safety_stock_cb_test channel change


DROP PROCEDURE if exists public.sync_oms_constraints_safety_stock();


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
INSERT INTO inventory_smart.oms_constraints_safety_stock
(article,
loc_code, 
channel, 
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
updated_at, 
column_updated)
SELECT 
src.article, 
src.loc_code, 
src.channel, 
src.vendor_code, 
src.vendor_name, 
src.safety_stock_method, 
src.safety_stock_twos, 
src.demand_twos, 
src.service_level_pct, 
src.stock_units, 
src.created_by, 
src.created_at, 
112 AS updated_by, 
current_timestamp AS updated_at, 
src.column_updated
FROM public.oms_constraints_safety_stock AS src
ON CONFLICT (article, loc_code, channel, vendor_code)
DO UPDATE 
SET vendor_name=EXCLUDED.vendor_name,
	safety_stock_method=EXCLUDED.safety_stock_method, 
	safety_stock_twos=EXCLUDED.safety_stock_twos, 
	demand_twos=EXCLUDED.demand_twos, 
	service_level_pct=EXCLUDED.service_level_pct,
	stock_units=EXCLUDED.stock_units,
	updated_by=112,
	updated_at=current_timestamp;
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