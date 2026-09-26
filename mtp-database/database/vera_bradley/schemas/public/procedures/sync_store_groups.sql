--liquibase formatted sql
--changeset liquibase:updated_sync_store_groups runOnChange:true stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_start
--comment: updated_sync_store_groups
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_groups();
CREATE OR REPLACE PROCEDURE public.sync_store_groups()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		INSERT INTO "global".store_groups_mapping (sg_code, store_code, ref_sg_code) 
		SELECT 
		  sg.sg_code, 
		  x.store_code, 
		  ref_sg_code 
		FROM 
		  public.store_group x 
		  join global.store_groups sg using("name")
		  join global.store_master sm using(store_code) on conflict do nothing;
	end
$procedure$
;
