--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:sync_oms_po_master runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_oms_po_master

DROP PROCEDURE IF EXISTS public.sync_oms_po_master(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_po_master(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_po_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then
            delete from
              inventory_smart.oms_po_master
            where
              true;
        end if;
  insert into inventory_smart.oms_po_master
      (order_id,
po_id,
asn_id,
product_code,
loc_code,
channel,
projected_delivery_date,
fiscal_year_week,
oo,
it,
pseudo_po,
quantity_ordered

      )
  select
       order_id,
po_id,
asn_id,
product_code,
loc_code,
channel,
projected_delivery_date,
fiscal_year_week,
oo,
it,
pseudo_po,
quantity_ordered
  from

    public.oms_po_master;
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
