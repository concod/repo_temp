--liquibase formatted sql
--changeset liquibase:sync_dc_pack_inventory runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_dc_pack_inventory
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_pack_inventory();
CREATE OR REPLACE PROCEDURE public.sync_dc_pack_inventory()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  inventory_smart.dc_pack_inventory 
		where 
		  true;
		INSERT INTO inventory_smart.dc_pack_inventory (
		  product_code, article, dc_code, pack_type_id, 
		  pack_type, oh_pack_qty, oo_pack_qty, 
		  it_pack_qty, channel, size
		) 
		select 
		  product_code, 
		  article, 
		  dc.dc_code, 
		  pack_type_id, 
		  pack_type, 
		  oh_pack_qty, 
		  oo_pack_qty, 
		  it_pack_qty,
		  channel,
		  size
		FROM 
		  public.dc_pack_inventory x 
		  join "global".store_master dc on x.dc_code = dc.store_code;
	end
$procedure$
;
