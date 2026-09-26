--liquibase formatted sql
--changeset saad_adeeb:sync_product_profile_delta runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-25885
--comment: initial changeset for sync_product_profile_delta
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_product_profile_delta();
CREATE OR REPLACE PROCEDURE public.sync_product_profile_delta()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_profile_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		INSERT INTO inventory_smart.product_profile_master (
				  pp_code, "name", description, special_classification, 
				  ph_code
				)
				with pp as (
					  select 
					    pp_code, 
					    "name", 
					    description, 
					    special_classification, 
					    jsonb_build_object('l0_name', l0_name, 'l1_name', l1_name, 'l2_name', l2_name, 'l3_name', l3_name, 'l4_name', l4_name, 'article', article) as path, 
					    6 as level 
					  from 
					    public.product_profile_delta 
					  group by 
					    1, 
					    2, 
					    3, 
					    4, 
					    l0_name, l1_name, l2_name, l3_name, l4_name, article
		
					)
				
				select distinct pp_code,name,description,special_classification,hierarchy_code as ph_code from pp
				left join global.product_hierarchies_filter
				using(path,level);
		
		INSERT INTO inventory_smart.product_profile_mapping (
				  pp_code, mapping_code, l0_name, size_level_proportion, 
				  overall_proportion, product_code, 
				  store_code
				) 
				select
					pp_code,
					pmps.mapping_code,
					pmps.l0_name,
					size_level_proportion,
					overall_proportion,
					product_code,
					store_code
				from
					public.product_profile_delta x
					left join global.product_mapping_product_store pmps
						using(l0_name, product_code,
					store_code);

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	END
$procedure$
;