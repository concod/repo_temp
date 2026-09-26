--liquibase formatted sql
--changeset liquibase:sync_store_clusters runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added the new_store_flag update logic
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
		UPDATE global.store_attributes_filter saf
 			SET new_store_flag = true
 			where store_code  in (select distinct a.store_code 
 			from global.store_attributes_filter a 
 			left join global.new_store_attributes b
 			on a.store_code=b.store_code 
 			where COALESCE(b.opening_date, a.open_date) > CURRENT_DATE and active and geography='NA');
 
		UPDATE global.store_attributes_filter saf
 			SET new_store_flag = false
 			where store_code not in (select distinct a.store_code 
 			from global.store_attributes_filter a 
 			left join global.new_store_attributes b
 			on a.store_code=b.store_code 
 			where COALESCE(b.opening_date, a.open_date) > CURRENT_DATE and active and geography='NA');
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
		  jsonb_build_object('l0_name', cluster_hierarchy) 
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

--made changes