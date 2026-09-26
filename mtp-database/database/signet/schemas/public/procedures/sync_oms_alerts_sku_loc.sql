--liquibase formatted sql
--changeset liquibase:sync_oms_alerts_sku_loc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_alerts_sku_loc
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_alerts_sku_loc(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_alerts_sku_loc(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_alerts_sku_loc';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
             delete from 
               inventory_smart.oms_alerts_sku_loc 
             where 
               true;
         end if;
   insert into inventory_smart.oms_alerts_sku_loc
       (id,
        product_code,
        loc_code,
        recom_receipt_date,
        next_order_cycle_date,
        expedite_order,
        need_before_next_roq,
        initial_program_sku_flag,
        is_expedite_order_resolved,
        is_need_before_next_roq_resolved,
        is_initial_program_sku_flag
       )
   select
        nextval('inventory_smart.oms_alerts_sku_loc_id_seq') as id,
        product_code,
        location,
        ideal_receipt_date::date,
 	   next_order_cycle_date::date,
        expidite_orders_flag,
        need_before_roq_flag,
        initial_program_sku_flag,
        false as is_expedite_order_resolved,
        false as is_need_before_next_roq_resolved,
        false as is_initial_program_sku_flag
   from
     --public.oms_constraints_status
     public.oms_alerts_need_before_roq_and_expidite_orders
   on conflict ON CONSTRAINT uk_oms_alerts_sku_loc do nothing; 
   /*set  expedite_order = excluded.expidite_orders_flag,
        need_before_next_roq = excluded.need_before_roq_flag,
        is_expedite_order_resolved = false,
        is_need_before_next_roq_resolved = false;*/
 
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
