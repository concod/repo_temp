--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:sync_loss_units_sku_store_level runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:MTP-22504
--comment: initial changeset for sync_loss_units_sku_store_level
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_loss_units_sku_store_level(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_loss_units_sku_store_level(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_loss_units_sku_store_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
        _worker text;
     begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        
        select async_query into _worker from public.async_query('call global.build_list_partitions(''loss_units_sku_store_level'');');
		    perform public.async_query_status(_worker, 'cleanup');

         _st := clock_timestamp();
         if _is_historic then 
             select async_query into _worker from public.async_query('delete from 
              inventory_smart.loss_units_sku_store_level 
            where 
              true;');
            perform public.async_query_status(_worker, 'cleanup');
         end if;
        raise notice 'Step1: %', (clock_timestamp() - _st);
        -- perform global.create_drop_index_list_ingestion('inventory_smart', 'loss_units_sku_store_level', true);
        -- raise notice 'Step2: %', (clock_timestamp() - _st);
       perform public.parellel_insert('WITH rows AS (
            INSERT INTO inventory_smart.loss_units_sku_store_level (
              product_hierarchy, product_code, 
              store_code, store_name, fiscal_year, 
              fiscal_week, "date", opening_inventory, 
              oo, it, quantity, cluster_avg_sales, 
              lost_units, line_amount, lost_sales, 
              wos_pred,fiscal_year_week
            ) 
            SELECT 
              product_hierarchy, 
              product_code, 
              store_code, 
              store_name, 
              fiscal_year, 
              fiscal_week, 
              "date", 
              opening_inventory, 
              oo, 
              it, 
              units, 
              cluster_avg_sales, 
              lost_units, 
              selling_price, 
              lost_sales, 
              fwos,
              (fiscal_year*100+fiscal_week) as fiscal_year_week 
            FROM 
              public.lost_sales_sku_store_level {where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.lost_sales_sku_store_level', 'date', 'pssd_idx');
        
        raise notice 'Step2: %', (clock_timestamp() - _st);
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
