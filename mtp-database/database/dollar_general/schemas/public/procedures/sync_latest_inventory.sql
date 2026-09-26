--liquibase formatted sql
--changeset rajat.choudhary-7:sync_latest_inventory_v3 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:009
--comment: parallel insert in the latest_inventory
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_latest_inventory(IN _is_historic boolean);
DROP PROCEDURE IF EXISTS public.sync_latest_inventory();
CREATE OR REPLACE PROCEDURE public.sync_latest_inventory(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare _worker text;
_st TIMESTAMP := clock_timestamp();
begin if _is_historic
    then
select
    async_query into _worker
from public.async_query('DELETE FROM inventory_smart.latest_inventory WHERE TRUE;');
perform public.async_query_status(_worker, 'cleanup');
raise notice 'Step1: %',
(clock_timestamp() - _st);
end if;
perform public.parellel_insert(
    ' WITH rows AS (
        insert into inventory_smart.latest_inventory (
             product_code,
    		 primary_sku,
    		 l0_code,
    		 l0_name,
    		 store_code,
    		 store_type,
    		 oh,
    		 it,
    		 oo,
    		 inv_date,
    		 channel,
    		 dc_code )
           SELECT
             product_code,
    		 primary_sku,
    		 l0_code,
    		 l0_name,
    		 store_code,
    		 store_type,
    		 oh,
    		 it,
    		 oo,
    		 inv_date,
    		 channel,
    		 dc_code 
           FROM public.latest_inventory
--		   join global.product_master using(product_code)
--		   WHERE CONCAT(product_code, "_", dc_code) not in (SELECT CONCAT(product_code, "_", dc_code) FROM inventory_smart.dc_pack_inventory)
 		   {where} RETURNING 1
           )
        SELECT 
		  count(1) as cnt 
		FROM 
		  rows;',
    50,
    'public.latest_inventory',
    'product_code',
    'lat_inv_product_code_idx',
    50
);
raise notice 'Step2: %',
(clock_timestamp() - _st);
end;
$procedure$
;

