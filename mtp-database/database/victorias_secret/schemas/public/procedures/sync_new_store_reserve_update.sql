--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_new_store_reserve_update_v2 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-759
--comment: Updated sync_new_store_reserve_update_v2 to change the eligibility from reservation_start_date to open date
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_new_store_reserve_update();
CREATE OR REPLACE PROCEDURE public.sync_new_store_reserve_update()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_reserve_update';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin      
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	delete from "global".new_store_reserve nsr 
	where exists (
		select 1 
		from global.new_store_attributes nsa
		where current_date < nsa.opening_date 
		and nsa.store_code = nsr.store_code 
	)
	and not exists 
	(
		select 1
		from inventory_smart.new_store_metrics nsm 
		where nsr.product_code = nsm.product_code and nsr.store_code = nsm.store_code
	);
	update global.new_store_reserve as nsr
	set past_releases_yest = past_releases
	where nsr.approved = true and nsr.is_deleted = false
  	and exists (
    	select 1
    	from global.new_store_attributes nsa
    	where current_date < nsa.opening_date 
		and nsa.store_code = nsr.store_code
	);
	insert into global.new_store_reserve (
	store_code,	product_code, "size", article, created_at, approved, remodel_flag
	)	
	select  nsm.store_code, nsm.product_code, paf."size", paf.article, NOW(), false, nsm.remodel_flag
	from inventory_smart.new_store_metrics nsm 
	join "global".product_attributes_filter paf using(product_code)
	where exists (
		select 1 
		from global.new_store_attributes nsa
		where current_date < nsa.opening_date 
		and nsa.store_code = nsm.store_code 
	)
	and not exists (
		select 1
		from "global".new_store_reserve nsr 
		where nsr.product_code = nsm.product_code and nsr.store_code = nsm.store_code
	);
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
