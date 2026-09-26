--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_allocate_replen_tag_v2 runOnChange:true stripComments:false splitStatements:false context:Victorias_secret_inventory_smart labels:VPP-321
--comment: Updated l6_name to article in order to fetch correct PH code
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_allocate_replen_tag();
CREATE OR REPLACE PROCEDURE public.sync_allocate_replen_tag()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_allocate_replen_tag';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	delete from 
	 		inventory_smart.allocate_replen_tag
	 	where 
	 		true;
 		INSERT INTO inventory_smart.allocate_replen_tag (
 		  article,ph_code,replenishment_status,
 		  last_updated_by,last_updated_at
 		)  		
 		select
 		  choice,hierarchy_code as ph_code ,replenishment_status,
 		  last_updated_by,last_updated_at
 		from
 		  public.allocate_replen_tag x
 		  join (
		    select 
		      hierarchy_code, 
		      path->>'article' as choice
		    from 
		      (
		        select 
		          hierarchy_level as level 
		        from 
		          global.product_generic_schema_mapping 
		        where 
		          generic_column_name = 'article'
		      ) x 
		      join global.product_hierarchies_filter phf using(level)
		      where active = true
		  ) y using(choice)
		  on conflict do nothing
 		 ;
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
