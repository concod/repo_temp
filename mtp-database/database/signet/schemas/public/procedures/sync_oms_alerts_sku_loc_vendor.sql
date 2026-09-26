--liquibase formatted sql
--changeset liquibase:sync_oms_alerts_sku_loc_vendor runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_alerts_sku_loc_vendor
--rollback: SELECT 1
--changeset aman.lakkoju@impactanalytics.co:Included order type in joining level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23378
--comment: Included order type in joining level to avoid duplicates
DROP PROCEDURE IF EXISTS public.sync_oms_alerts_sku_loc_vendor(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_alerts_sku_loc_vendor(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_alerts_sku_loc_vendor';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.oms_alerts_sku_loc_vendor 
            where 
              true;
        end if;
  insert into inventory_smart.oms_alerts_sku_loc_vendor
      (id,
       product_code,
       loc_code,
       vendor_code,
       recom_receipt_date,
	   next_order_cycle_date,
       recom_order,
       pending_order,
       is_recom_order_resolved,
       is_pending_order_resolved,
       ia_order_id
      )
  select
       nextval('inventory_smart.oms_alerts_sku_loc_vendor_id_seq') as id,
       product_code,
       location,
       vendor_code,
       case when ideal_receipt_date = '' then null else  ideal_receipt_date::date end ,
       next_order_cycle_date::date,
       recommended_orders_flag,
       pending_orders_flag,
       false,
       false,
       ia_order_id
  from
    --public.oms_alerts_recommended_orders
  (select a.product_code,a.loc_code as location,a.vendor_code,order_type,
	case when order_status_id = 0 then recommended_orders_flag else False end as recommended_orders_flag,
	case when order_status_id in (1,2,-1) then True else False end as pending_orders_flag,
	case when ideal_receipt_date is null then '' else ideal_receipt_date end as ideal_receipt_date,
	next_order_cycle_date,ia_order_id from
	(select id as ia_order_id,product_code,loc_code,vendor_code,order_status_id,order_placement_date,order_type
	 from inventory_smart.oms_orders_recommended oor
	 where order_status_id in (0,1,2,-1) and oor.is_deleted = False
	) as a
	left join 
	(select product_code,location as loc_code,vendor_code,recommended_orders_flag,
	ideal_receipt_date,next_order_cycle_date,order_placement_date::date,order_type from public.oms_alerts_recommended_orders as aslv) as b
	using(product_code,loc_code,vendor_code,order_placement_date,order_type)) as c
  on conflict ON CONSTRAINT uk_oms_alerts_sku_loc_vendor do nothing ;

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
