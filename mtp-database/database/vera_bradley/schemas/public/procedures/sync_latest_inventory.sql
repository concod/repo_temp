--liquibase formatted sql
--changeset liquibase:sync_latest_inventory runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_latest_inventory
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_latest_inventory();
CREATE OR REPLACE PROCEDURE public.sync_latest_inventory()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  inventory_smart.latest_inventory 
		where 
		  true;
		insert into inventory_smart.latest_inventory (
		  product_code, store_code, 
		  --child_sku, 
		  oh, it, oo, channel
		) 
		SELECT 
		  product_code, 
		  store_code, 
		  --child_sku, 
		  oh, 
		  it, 
		  oo,
		  channel 
		FROM 
		  public.latest_inventory x 
		  join global.product_master using(product_code);
	end
$procedure$
;
