--liquibase formatted sql
--changeset liquibase:sync_store_clusters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_clusters
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_clusters();
CREATE OR REPLACE PROCEDURE public.sync_store_clusters()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete FROM 
		  inventory_smart.store_clusters 
		where 
		  true;
		INSERT INTO inventory_smart.store_clusters (
		  store_code, "cluster", cluster_hierarchy
		) 
		SELECT 
		  x.store_code, 
		  "cluster", 
		  jsonb_build_object('l0_name', l0_name, 'l1_name', l1_name) 
		FROM 
		  public.store_clusters x join 
		 global.store_master sm using(store_code);
	end
$procedure$
;
