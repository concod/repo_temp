--liquibase formatted sql
--changeset liquibase:sync_dc_reserve_quantity runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_dc_reserve_quantity
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_reserve_quantity();
CREATE OR REPLACE PROCEDURE public.sync_dc_reserve_quantity()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		insert into inventory_smart.dc_reserve_quantity (
		  product_code, quantity, channel, updated_at, 
		  "type", inventory_source, dc_code, 
		  mapping_code
		) 
		select 
		  drq.product_code, 
		  drq.reserve_quantity, 
		  null, 
		  now(), 
		  'dc', 
		  'dc_reserve', 
		  sm.dc_code, 
		  ppd.mapping_code 
		from 
		  public.dc_reserve_quantity drq 
		  join global.store_master sm using(store_code) 
		  join global.product_master pm using(product_code) 
		  join global.product_mapping_product_dc ppd on pm.product_code = ppd.product_code 
		  and sm.dc_code = ppd.dc_code 
		where 
		  drq.reserve_quantity > 0 on conflict(
		    product_code, channel, inventory_source, 
		    dc_code, type
		  ) do 
		update 
		set 
		  quantity = excluded.quantity;
	end
$procedure$
;
