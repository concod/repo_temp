--liquibase formatted sql
--changeset aman.lakkoju:added_coo_column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-41696
--comment: added_coo_column
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_recommended_orders_base();
CREATE OR REPLACE PROCEDURE public.sync_oms_recommended_orders_base(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_recommended_orders_base';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   -- Delete orders recommeded and retain only with pending approval
   delete from inventory_smart.oms_orders_recommended_base
   where order_status_id  = 0 ;
   
   if _is_historic then 
             delete from 
               inventory_smart.oms_orders_recommended_base 
             where 
               true;
         end if;
   insert into inventory_smart.oms_orders_recommended_base
       (id,
        order_gen_type,
        product_code ,
		fiscal_year_week ,
		loc_code ,
		vendor_code,                        
		start_week_date,
    start_week_date_dynamic,
		expected_receipt_date,
		unit_cost,
		roq,
    constrained_roq,
    order_type,
		not_before_date,
		not_after_date,
        order_status_id,
        created_by,
        created_at,
        updated_by,
        updated_at,
        approve_by_date,
        is_deleted,
        is_resolved,
        country_origin
        )
   select
        nextval('inventory_smart.oms_orders_recommended_base_id_seq') as id,
        'Recommended' as order_gen_type,
        product_code ,
		fiscal_year_week ,
		location ,
		vendor_code,              
		start_week_date::date,
    start_week_date_dynamic::date,
		expected_receipt_date::date,
		unit_cost,
		roq,
    constrained_roq,
    order_type,
		not_before_date::date,
		not_after_date::date,
        0 as order_status_id,
        3 as created_by,
        current_timestamp as created_at,
        null as updated_by ,
        null as updated_at ,
        current_date+7, --approve_by_date,
        false as is_deleted,
        false as is_resolved,
        country_origin 
   from
     --public.oms_orders_recommended
     public.oms_recommendation_base_data
   ON conflict on constraint uk_oms_orders_recommended_base DO NOTHING;
  
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
