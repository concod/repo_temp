--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:sync_product_store_attributes_filter_v5 runOnChange:true stripComments:false splitStatements:false context:Release_11_v5
--comment: adding procedure for sync_product_store_attributes_filter_v5

DROP PROCEDURE if exists public.sync_product_store_attributes_filter();

CREATE OR REPLACE PROCEDURE public.sync_product_store_attributes_filter()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_attributes_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

-- Step 1: Clear rcl_psa_config_table
       TRUNCATE TABLE "inventory_smart".rcl_psa_config_table;
       
       -- Step 2: Insert data into rcl_psa_config_table
       INSERT INTO "inventory_smart".rcl_psa_config_table (
           l0_name,
           l1_name,
           --"class",
		   --subclass,
           psa_name,
           psa_code,
		   store_tier,
		   store_category,
		   geo_region,
           sub_psa_code,
           updated_at
       )
       SELECT DISTINCT
           l0_name,
           l1_name,
           --"class",
           --subclass,
           case when 'store_tier' = any(store_hierarchy_level) then psa_name else null end,
           psa_code,
		   case when 'store_tier' = any(store_hierarchy_level) then psa_name else null end,
		   --case when 'store_tier' = any(store_hierarchy_level) then store_tier else null end,
           case when 'store_category' = any(store_hierarchy_level) then store_category else null end,
           case when 'geo_region' = any(store_hierarchy_level) then geo_region else null end,
           case when store_hierarchy_level = '{}' then 'all' else substr(psa_code, 8) end,
           now()
       FROM global.product_store_attributes_filter x
       ON CONFLICT DO NOTHING;
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
