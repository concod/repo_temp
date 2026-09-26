-- liquibase formatted sql
-- changeset pradeep.kumar@impactanalytics.co:adding_qty_ordered_test runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:adding_qty_ordered_test
-- comment: adding qty ordered column

DROP PROCEDURE IF EXISTS public.sync_oms_po_master();

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
INSERT INTO inventory_smart.oms_po_master( 
	po_id, 
	product_code, 
	loc_code, 
	channel, 
	fiscal_year_week,
	quantity_ordered, 
	oo, 
	it, 
	projected_delivery_date, 
	created_by, 
	created_at, 
	updated_by, 
	updated_at, 
	column_updated, 
	order_id, 
	asn_id, 
	pseudo_po
)
SELECT  
	src.po_id, 
	src.product_code, 
	src.loc_code, 
	src.channel, 
	src.fiscal_year_week,
	src.quantity_ordered, 
	src.oo, 
	src.it, 
	src.projected_delivery_date, 
	src.created_by, 
	src.created_at, 
	112 as updated_by,
  	current_timestamp as updated_at, 
	src.column_updated, 
	src.order_id, 
	src.asn_id, 
	src.pseudo_po
FROM public.oms_po_master AS src
ON CONFLICT 
	(po_id,product_code,loc_code,channel,projected_delivery_date)
DO UPDATE 
SET   
	fiscal_year_week=EXCLUDED.fiscal_year_week,
	quantity_ordered=EXCLUDED.quantity_ordered, 
	oo=EXCLUDED.oo, 
	it=EXCLUDED.it,
	created_by=EXCLUDED.created_by, 
	created_at=EXCLUDED.created_at, 
	updated_by=112, 
	updated_at=current_timestamp, 
	column_updated=EXCLUDED.column_updated, 
	order_id=EXCLUDED.order_id, 
	asn_id=EXCLUDED.asn_id, 
	pseudo_po=EXCLUDED.pseudo_po;
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