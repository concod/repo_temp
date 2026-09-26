--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_asn_master_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sync_asn_master 
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_asn_master();

CREATE OR REPLACE PROCEDURE public.sync_asn_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
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
		  asn_code, asn_id, po_code, po_id, channel,appointment_date,requirement_date, vi_date,
		  dc_code, allocated_qty, available_qty,not_before_date,
    	  handling_type, receiver_number, pack_type_id, article, number_of_allocations, active_asn_flag
		) 
		select po_code as asn_code, 
		  po_code AS asn_id,
--		  product_code as asn_item,
    	  SPLIT_PART(po_code, '_', 2) AS po_code,
    	  SPLIT_PART(po_code, '_', 2) AS po_id,
--    	  product_code as po_item,
		  channel, 
		  requirement_date as appointment_date, -- dc appt date -> appointment_date
		  case when requirement_date is NULL or requirement_date = '1900-01-01' then vi_date else requirement_date end as requirement_date, -- condn applied for new requirement date
		  vi_date,
		  dc_code, 
		  sum(allocated_qty) as allocated_qty, 
		  sum(available_qty) as available_qty,
		  not_before_date,
    	  handling_type,
    	  receiver_number,
    	  product_code as pack_type_id,
    	  article,
    	  0 as number_of_allocations,
		  active_asn_flag
		  from (
		SELECT 
		  po_code, 
		  product_code, 
		  channel, 
		  requirement_date,
		  vi_date, 
		  dc.dc_code, 
		  allocated_qty, 
		  available_qty,
		  not_before_date,
    	  handling_type,
    	  reciever_number as receiver_number,
    	  article,
		  active_asn_flag
		FROM 
		  public.po_latest x 
		  join global.store_master dc on x.dc_code = dc.store_code 
		  join global.product_attributes_filter pm using(product_code) 
		where 
		--   requirement_date >= current_date 
			current_date >= not_before_date) x 
		  group by po_code, dc_code, product_code, channel, requirement_date, vi_date, not_before_date,
    	  handling_type,
    	  receiver_number,
    	  article, active_asn_flag;
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
