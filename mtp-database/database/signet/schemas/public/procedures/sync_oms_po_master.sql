--liquibase formatted sql
--changeset liquibase:sync_oms_po_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_po_master
--rollback: SELECT 1
--changeset aman.lakkoju.k:added product_channel_name column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-31858
--comment: added product_channel_name column
DROP PROCEDURE IF EXISTS public.sync_oms_po_master(IN _is_historic boolean);
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
 (
  product_code,
  "location",
  channel,
  quantity_ordered,
  open_quantity,
  store_type,
  fiscal_year,
  fiscal_week,
  quantity_received,
  primary_wh,
  po_id,
  vendor_code,
  completed_date,
  not_before_date,
  not_after_date,
  "date",
  store_banner,
  product_channel_name,
  product_banner,
  ideal_receipt_date
 )
 (select 
 a.product_code,
  a."location",
  channel,
  quantity_ordered,
  open_quantity,
  store_type,
  fiscal_year,
  fiscal_week,
  quantity_received,
  primary_wh,
  po_id,
  vendor_code::varchar,
  completed_date::date,
  not_before_date::date,
  not_after_date::date,
  "date"::date,
  store_banner,
  product_channel_name,
  product_banner,
  b.ideal_receipt_date::date
  from public.oms_po_master as a
  left join 
  (select distinct product_code,"location",ideal_receipt_date from
  public.oms_recommendation_input_data
  inner join 
   (select product_code,"location" ,min(start_week_date) as start_week_date from 
   public.oms_recommendation_input_data  
     group by 1,2) b
   using(product_code,"location" ,start_week_date) 
  ) as  b 
  on a.product_code = b.product_code and a."location" = b."location" );
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
