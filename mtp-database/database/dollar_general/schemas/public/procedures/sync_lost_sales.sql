--liquibase formatted sql
--changeset laraib.ahmad:lost_sales runOnChange:true stripComments:false splitStatements:false context:00 labels:0047
--comment: Updated column for lost_sales
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.lost_sales();
DROP PROCEDURE IF EXISTS public.sync_lost_sales(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_lost_sales(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_lost_sales';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    call global.build_list_partitions('lost_sales');
	 	if _is_historic then 
	 		delete from 
	 		  inventory_smart.lost_sales 
	 		where 
	 		  true;
 		end if;
		INSERT INTO inventory_smart.lost_sales (
                                              psa_name,
                                              product_code,	
                                              primary_sku,
                                              product_description,	
                                              l0_code,
                                              l0_name,	
                                              l1_name,	
                                              l3_name,	
                                              l4_name,	
                                              fiscal_year_week,
                                              opening_inventory,
                                              units,
                                              lost_units,
                                              lost_sales,
                                              cluster_avg_sales
		) 
		SELECT 
       psa_name,
       product_code,	
       primary_sku,
       product_description,	
       l0_code,
       l0_name,	
       l1_name,	
       l3_name,	
       l4_name,	
       fiscal_year_week,
       oh,
       actual_sales,
       lost_sales_units,
       lost_sales_dollar,
       cluster_avg_sales
		FROM 
		  public.lost_sales;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end;
$procedure$
;
