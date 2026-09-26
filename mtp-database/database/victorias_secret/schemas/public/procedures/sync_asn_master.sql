--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_asn_master_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:VS-105
--comment: null asn_id handeling in asn_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_asn_master();
CREATE OR REPLACE PROCEDURE public.sync_asn_master()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_asn_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.asn_master 
 		where 
 		  true;
 		insert into inventory_smart.asn_master (
 		  asn_code,asn_id,asn_item,po_code,po_id,po_item,requirement_date,channel,
 		  available_qty,dc_code,pack_type_id,article,number_of_allocations
 		) 
 		(
 		  SELECT 
 		  asn_code, 
 		  asn_id,
 		  asn_item,
 		  concat(po_id,'_',po_item) as po_code,
 		  po_id,
 		  po_item, 
 		  asn_delivery_date as requirement_date, 
 		  x.channel, 
 		  asn_qty as available_qty,
 		  dc.dc_code, 
 		  product_code as pack_type_id,
 		  l6_id as article,
          coalesce(number_of_allocations,0) as number_of_allocations
 		  FROM 
 		  public.asn_master x 
 		  join global.store_master dc on x.store_code = dc.store_code 
 		  join global.product_master pm using(product_code)
 		  join global.product_attributes_filter paf using(product_code)
 		  left join(
 		  SELECT article,channel,count(distinct allocation_code) as number_of_allocations 
 FROM inventory_smart.create_allocation_result_flat_gurobi carfs
 LEFT JOIN global.store_attributes_filter saf ON store_code = store
 LEFT JOIN (
 SELECT * FROM inventory_smart.plan_master where type in ('0','2')
 ) pm ON carfs.allocation_code = pm.plan_code where
  pm.status = 2
 AND pm.is_deleted = false
 group by 1,2
  		  ) as c on x.channel=c.channel and paf.l6_id=c.article
 		where 
 		  1=1 and x.asn_id is not null);
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
