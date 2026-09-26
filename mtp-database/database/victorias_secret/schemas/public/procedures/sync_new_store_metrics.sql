--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_new_store_metrics_v3 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-638
--comment: Updated SP for sync_new_store_metrics
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_new_store_metrics();
CREATE OR REPLACE PROCEDURE public.sync_new_store_metrics()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_metrics';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from inventory_smart.new_store_metrics nsm1
		where not exists (
			select 1 from public.new_store_metrics x
			where x.product_code = nsm1.product_code and x.store_code = nsm1.store_code
		);
      	insert into inventory_smart.new_store_metrics (
      		product_code,
      		store_code,
      		need,
      		po_upcoming_units ,
			remodel_flag
      	)
		select 
		product_code,
      	store_code,
      	need,
      	po_upcoming_units,
		remodel_flag
      	from
      	(	
      		select 
      			product_code,
      			store_code,
      			case when nsa.reservation_start_date<=current_date then nsm2.need else nsm1.need end as need ,
      			nsm1.po_upcoming_units ,
				nsm1.remodel_flag
			from public.new_store_metrics nsm1
			left join inventory_smart.new_store_metrics nsm2
			using(product_code,store_code)
			left join "global".new_store_reserve nsr 
			using(product_code,store_code)
			left join global.new_store_attributes nsa
			using(store_code)
		)x 
		on conflict(product_code, store_code)
		do update 
		set need = excluded.need,
		po_upcoming_units = excluded.po_upcoming_units;
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
