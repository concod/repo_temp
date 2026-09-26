--liquibase formatted sql
--changeset liquibase:sync_store_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_dc_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_dc_mapping();
CREATE OR REPLACE PROCEDURE public.sync_store_dc_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		INSERT INTO "global".product_mapping_store_dc (
		  mapping_type, store_code, dc_code, 
		  is_active
		) 
		select 
		  mapping_type, 
		  x.store_code, 
		  dc.dc_code, 
		  is_active 
		from 
		  public.store_dc_mapping x 
		  join global.store_master sm using(store_code) 
		  join global.store_master dc on x.dc_code = dc.store_code on conflict DO nothing;
	end
$procedure$
;
