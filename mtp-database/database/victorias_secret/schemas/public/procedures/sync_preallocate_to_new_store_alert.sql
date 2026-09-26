--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_preallocate_to_new_stores_alert_v4 runOnChange:true stripComments:false splitStatements:false context:VS_Inv_Smart labels:VS-493
--comment: Updating SP to have only the new stores 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_preallocate_to_new_stores_alert();
CREATE OR REPLACE PROCEDURE public.sync_preallocate_to_new_stores_alert()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_preallocate_to_new_stores_alert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
 		  inventory_smart.preallocate_to_new_stores_alert 
 		where 
 		  true;
 		insert into inventory_smart.preallocate_to_new_stores_alert (
 		store_code,
		store_name,
		location_hierarchy_region_code,
		s1_name,
		s3_name,
		s4_name,
		opening_date,
		reservation_date,
		total_sku_count,
		approved_sku_count,
		released_sku_count,
		approval_needed,
		release_needed,
		new_store_reserve_flag,
		nsr_is_resolved,
		channel)

		with new_store_metrics as (
			select store_code, 
			count(product_code) as total_sku_count,
			sum(approved::int4) as approved_sku_count,
			sum(released::int4) as released_sku_count
			from "global".new_store_reserve nsr 
			where remodel_flag=false
			group by 1
		)

		select 
		store_code,
		nsd.store_name,
		saf.location_hierarchy_region_code,
		saf.s1_name,
		saf.s3_name,
		saf.s4_name,
		coalesce(nsa.opening_date,saf.open_date) as opening_date,
		nsa.reservation_start_date as reservation_date,
		nsm.total_sku_count,
		nsm.approved_sku_count,
		nsm.released_sku_count,
		case when 
		( current_date < nsa.reservation_start_date and nsm.total_sku_count <> nsm.approved_sku_count )
		then 'Yes' else 'No' END as approval_needed,
		case when 
		( (current_date between nsa.reservation_start_date and nsa.opening_date) and nsm.released_sku_count <> nsm.approved_sku_count )
		then 'Yes' else 'No' end as release_needed,
		1 as new_store_reserve_flag,
		0 as nsr_is_resolved,
		channel
		from "global".new_store_data nsd 
		left join new_store_metrics nsm using(store_code)
		left join "global".new_store_attributes nsa using(store_code)
		left join "global".store_attributes_filter saf  using(store_code)
		where nsd.remodel_flag=false
		on conflict do nothing;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
		end;
$procedure$
;
