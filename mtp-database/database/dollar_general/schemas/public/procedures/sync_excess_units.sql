--liquibase formatted sql
--changeset swapnil.bhange-4:sync_sync_excess_units_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:0056
--comment: added 2 new columns for sync_sync_excess_units
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_excess_units(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_excess_units(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_excess_units';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	if _is_historic then 
	 		delete from 
	 		  inventory_smart.excess_units 
	 		where 
	 		  true;
 		end if;
		INSERT INTO inventory_smart.excess_units (
                                              psa_name
                                              ,product_code
                                              ,primary_sku
                                              ,product_description
                                              ,l0_code
                                              ,l0_name
                                              ,l1_name
                                              ,l3_name
                                              ,l4_name
                                              ,fiscal_year_week
                                              ,oh
                                              ,actual_sales
                                              ,it
                                              ,oo
                                              ,ros
                                              ,forecast
                                              ,wos_threshold
                                              ,wos
                                              ,inventory_closing_balance
                                              ,excess_inventory
                                              ,excess_inventory_cost
                                              ,date
                                              ,actual_sales_cost
                                              ,inventory_closing_balance_cost

		) 
		SELECT 
       psa_name
      ,product_code
      ,primary_sku
      ,product_description
      ,l0_code
      ,l0_name
      ,l1_name
      ,l3_name
      ,l4_name
      ,fiscal_year_week
      ,oh
      ,actual_sales
      ,it
      ,oo
      ,ros
      ,forecast
      ,wos_threshold
      ,wos
      ,inventory_closing_balance
      ,excess_inventory
      ,excess_inventory_cost
      ,date
      ,actual_sales_cost
      ,inventory_closing_balance_cost
		FROM 
		  public.excess_inventory;
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
