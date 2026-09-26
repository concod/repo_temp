-- liquibase formatted sql
-- changeset pradeep.kumar@impactanalytics.co:lead_time_table_name_change runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_lead_time
-- comment:updating lead time table name

DROP  PROCEDURE if exists public.sync_oms_constraints_lead_time();

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
INSERT INTO inventory_smart.oms_constraints_lead_time
	(article, 
	loc_code, 
	channel, 
	vendor_code, 
	vendor_name, 
	shipping_lead_time,
	qc_time, 
	po_to_order_processing, 
	mode_shipment, 
	manufacturing_lead_time, 
	fabric_lt, 
	default_mode, 
	lead_time, 
	from_date, 
	to_date, 
	created_by, 
	created_at, 
	updated_by, 
	updated_at, 
	column_updated
	)
SELECT 
	article,
	'-' as loc_code, 
	channel, 
	vendor_code, 
	vendor_name, 
	shipping_lead_time,
	qc_time, 
	po_to_order_processing, 
	mode_shipment, 
	NULL AS manufacturing_lead_time, 
	fabric_lt, 
	default_mode, 
	lead_time, 
	from_date,
	to_date::date, 
	created_by, 
	created_at,
	updated_by,
	updated_at, 
	column_updated
from
    public.oms_constraints_lead_time
ON CONFLICT ON CONSTRAINT pk_oms_constraints_lead_time do update 
SET
	vendor_name=excluded.vendor_name,
	shipping_lead_time=excluded.shipping_lead_time,
	qc_time=excluded.qc_time,
	po_to_order_processing=excluded.po_to_order_processing,
	fabric_lt=excluded.fabric_lt,
	lead_time = excluded.lead_time,
	from_date=excluded.from_date::date,
	to_date=excluded.to_date::date,
	updated_by = excluded.updated_by,
	updated_at = excluded.updated_at;
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