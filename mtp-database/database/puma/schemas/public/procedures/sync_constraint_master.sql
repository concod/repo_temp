--liquibase formatted sql
--changeset ashish@impactanalytics.co:sync_constraint_master runOnChange:true stripComments:false splitStatements:false context:New_Sync_Stratgy labels:DAT-832
--comment: added new column erpseasoncdactive
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_constraint_master();
CREATE OR REPLACE PROCEDURE public.sync_constraint_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		call global.build_list_partitions('constraint_master');
		INSERT INTO inventory_smart.constraint_master (
		  mapping_code, l0_name, channel, product_code, 
		  store_code, wos, transit_time, safety_stock, 
		  min_stock, max_stock, aps, ros
		) 
		SELECT 
 		  pmps.mapping_code, 
 		  pmps.l0_name,
 		  x.channel, 
 		  x.product_code, 
 		  x.store_code, 
 		  x.wos, 
 		  x.transit_time, 
 		  x.safety_stock, 
 		  coalesce(x.min_stock, 0) as min_stock, 
 		  coalesce(x.max_stock, 0) as max_stock, 
 		  x.aps, 
 		  x.ros
 		FROM 
 		  public.constraint_master x 
 		  -- join "global".product_attributes_filter paf on x.product_code= paf.product_code
 		  left join global.product_mapping_product_store pmps
 		  on x.product_code = pmps.product_code
 		  -- and pmps.product_code= paf.product_code
 		  and x.store_code = pmps.store_code 
 		  on conflict do nothing;
	end
$procedure$
;
