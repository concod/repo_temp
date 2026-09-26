--liquibase formatted sql
--changeset abijithsarath.menon@impactanalytics.co:sync_store_clusters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_sync_store_clusters
--comment: initial changeset for sync_store_clusters
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_clusters();
CREATE OR REPLACE PROCEDURE public.sync_store_clusters()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_clusters';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete FROM 
		  inventory_smart.store_clusters 
		where 
		  true;
		INSERT INTO inventory_smart.store_clusters (
		  store_code, "cluster",cluster_hierarchy
		) 	
		SELECT 
		  x.store_code, 
		  cluster, 
		  cluster_hierarchy::jsonb as cluster_hierarchy  
		FROM 
		  public.store_clusters x join 
		 global.store_master sm using(store_code);
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


