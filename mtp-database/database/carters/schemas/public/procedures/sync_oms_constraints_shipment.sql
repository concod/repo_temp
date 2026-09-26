-- liquibase formatted sql
-- changeset pradeep.kumar@impactanalytics.co:added_moq_tolerance_column runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_shipment
-- comment: added_moq_tolerance column

DROP PROCEDURE IF EXISTS public.sync_oms_constraints_shipment();

CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_shipment(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_shipment';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.oms_constraints_shipment
            where 
              true;
        end if;
INSERT INTO inventory_smart.oms_constraints_shipment
	(product_code,
	loc_code, 
	channel, 
	vendor_code, 
	vendor_name, 
	min_replenishment_quantity, 
	max_replenishment_quantity, 
	order_multiple, 
	created_by, 
	created_at, 
	updated_by, 
	updated_at, 
	column_updated,
	moq_tolerance)
SELECT 
	src.product_code, 
	'-' AS loc_code, 
	src.channel, 
	src.vendor_code, 
	src.vendor_name, 
	src.min_replenishment_quantity, 
	src.max_replenishment_quantity, 
	src.order_multiple, 
	src.created_by, 
	src.created_at, 
	updated_by, 
	updated_at, 
	src.column_updated,
	src.moq_tolerance
FROM public.oms_constraints_shipment AS src
ON CONFLICT (product_code, loc_code, channel, vendor_code)
DO UPDATE 
SET 
	vendor_name=EXCLUDED.vendor_name,
	min_replenishment_quantity=EXCLUDED.min_replenishment_quantity, 
	max_replenishment_quantity=EXCLUDED.max_replenishment_quantity, 
	order_multiple=EXCLUDED.order_multiple, 
	updated_by=EXCLUDED.updated_by, 
	updated_at=EXCLUDED.updated_at,
	moq_tolerance=EXCLUDED.moq_tolerance;
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