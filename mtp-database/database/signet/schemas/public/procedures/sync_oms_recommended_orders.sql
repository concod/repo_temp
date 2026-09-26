--liquibase formatted sql
--changeset aman.lakkoju:adding target_qty column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22839
--comment:adding target_qty column  in recommendation table
--rollback: SELECT 1
--changeset aman.lakkoju:added_coo_column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-45153
--comment:added_coo_column
DROP PROCEDURE IF EXISTS public.sync_oms_recommended_orders(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_recommended_orders(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_recommended_orders';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  -- Delete orders recommeded and retain only with pending approval
  delete from inventory_smart.oms_orders_recommended
   where (order_status_id = 0) or (order_status_id = 3 and is_deleted = True);
  
  if _is_historic then 
            delete from 
              inventory_smart.oms_orders_recommended 
            where 
              true;
        end if;
  insert into inventory_smart.oms_orders_recommended
      (id,
       order_gen_type,
       product_code,
       loc_code,
       vendor_code,
       ROP,
       Grade,
       order_quantity,
       raw_roq,
       unit_cost,
       ROQ_constrained,
       ROQ_unconstrained,
       order_placement_date,
       order_placement_recom_date,
       expected_receipt_date,
       recom_receipt_date,
       not_before_date,
       not_after_date,
       ROP_Ideal,
       lead_time,	
       effective_lead_time,
       min_order_quantity,
       max_order_quantity,
       pack_size,
       inventory_hold,
       order_status_id,
       created_by,
       created_at,
       updated_by,
       updated_at,
       approve_by_date,
       is_deleted,
       is_resolved,
       editable_not_before_date,
       editable_not_after_date,
       lost_sales_agg,
       lost_sales_agg_1,
       lost_sales_agg_2,
       inventory_deficit_agg,
       orders_upto_qty,
       forecasted_sales,
       target_qty,
       target_wos,
       elt_projected_bop,
       elt_projected_safety_stock,
       order_type,
       excess_inv,
       unmapped_store_inventory,
       store_groups,
       store_counts,
       country_origin
       )
  select
       nextval('inventory_smart.oms_orders_recommended_id_seq') as id,
       'Recommended' as order_gen_type,
       product_code,
       location, --loc_code,
       vendor_code,
       start_week_date::date,--ROP,
       Grade,
       roq,--order_quantity,
       raw_roq,
       unit_cost,
       constrained_roq::float, --ROQ_constrained,
       roq, --ROQ_unconstrained,
       start_week_date_dynamic::date, --order_placement_date,
       start_week_date_dynamic::date,--order_placement_recom_date,
       expected_receipt_date::date,
       ideal_receipt_date::date,
       not_before_date::date,
       not_after_date::date,
       start_week_date_dynamic::date,--ROP_Ideal,
       vendor_lead_time,--lead_time,	
       eff_lead_time,--effective_lead_time,
       min_order_qty,--min_order_quantity,
       max_order_qty,--max_order_quantity,
       pack_size,
       inventory_hold,
       0 as order_status_id,
       3 as created_by,
       current_timestamp as created_at,
       null as updated_by ,
       null as updated_at ,
       current_date+7, --approve_by_date,
       false as is_deleted,
       false as is_resolved,
       not_before_date::date,
       not_after_date::date,
       lost_sales_agg,
       lost_sales_agg_1,
       lost_sales_agg_2,
      inventory_deficit_agg,
       orders_upto_qty,
       round(forecasted_sales) as forecasted_sales,
       target_qty,
       target_wos,
       elt_projected_bop,
       elt_projected_safety_stock,
       order_type,
       excess_inv,
       unmapped_store_inventory,
       store_groups,
       store_counts,
       country_origin
  from
    --public.oms_orders_recommended
    public.oms_recommendation_input_data
  ON conflict on constraint uk_oms_orders_recommended DO NOTHING;
 
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
