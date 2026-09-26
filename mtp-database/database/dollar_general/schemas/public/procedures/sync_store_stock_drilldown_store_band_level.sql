--liquibase formatted sql
--changeset swapnil.bhange-4:sync_store_stock_drilldown_store_band_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:0074
--comment: commented SECURITY DEFINER for sync_store_stock_drilldown_store_band_level
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_stock_drilldown_store_band_level();
DROP PROCEDURE IF EXISTS public.sync_store_stock_drilldown_store_band_level(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_store_stock_drilldown_store_band_level(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
--  SECURITY DEFINER
AS $procedure$
declare _worker text;
_st TIMESTAMP := clock_timestamp();
begin if _is_historic
    then
select
    async_query into _worker
from public.async_query('DELETE FROM inventory_smart.store_stock_drilldown_store_band_level WHERE TRUE;');
perform public.async_query_status(_worker, 'cleanup');
raise notice 'Step1: %',
(clock_timestamp() - _st);
end if;
perform public.parellel_insert(
    ' WITH rows AS (
        insert into inventory_smart.store_stock_drilldown_store_band_level (
            product_code	
           ,primary_sku	
           ,product_description	
           ,l0_code	
           ,l0_name	
           ,l1_name	
           ,l3_name	
           ,l4_name	
           ,psa_name
           ,target_st_percentage	
           ,st_percentage	
           ,std_receipt_units	
           ,std_receipt_cost	
           ,std_sales_cost	
           ,std_sales_units	
           ,lw_st_percentage	
           ,lw_receipt_units	
           ,lw_receipt_cost	
           ,lw_sales_cost	
           ,lw_sales_units	
           ,lw_revenue	
           ,wos	
           ,oh	
           ,it	
           ,oo	
           ,total_inv	
           ,dc_oh	
           ,dc_it	
           ,dc_oo	
           ,total_inv_dc	
           ,sku_status	
           ,store_status
           )
            SELECT 
            product_code	
           ,primary_sku	
           ,product_description	
           ,l0_code	
           ,l0_name	
           ,l1_name	
           ,l3_name	
           ,l4_name	
           ,psa_name
           ,target_st_percentage	
           ,st_percentage	
           ,std_receipt_units	
           ,std_receipt_cost	
           ,std_sales_cost	
           ,std_sales_units	
           ,lw_st_percentage	
           ,lw_receipt_units	
           ,lw_receipt_cost	
           ,lw_sales_cost	
           ,lw_sales_units	
           ,lw_revenue	
           ,wos	
           ,oh	
           ,it	
           ,oo	
           ,total_inv	
           ,dc_oh	
           ,dc_it	
           ,dc_oo	
           ,total_inv_dc	
           ,sku_status	
           ,store_status
           FROM public.store_stock_drilldown_store_band_level {where} RETURNING 1
           )
        SELECT 
		  count(1) as cnt 
		FROM 
		  rows;',
    50,
    'public.store_stock_drilldown_store_band_level',
    'product_code',
    'ssd_product_code_idx',
    50
);
raise notice 'Step2: %',
(clock_timestamp() - _st);
end;
$procedure$
;