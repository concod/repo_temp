--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:sync_product_store_attributes_filter_2 runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_product_store_attributes_filter
--comment: adding store_name column

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
 		delete from 
 		  "global".product_store_attributes_filter
 		  where 
	          true
 		;
 		INSERT INTO "global".product_store_attributes_filter(
 	l0_name,
    l1_name,
    l2_name,
    l0_id,
    l1_id,
    l2_id,
 	psa_code,
 	psa_name,
 	store_code,
 	store_grade,
    store_cluster,
	store_name,
	store_hierarchy_level
 		) 
 		
select 	
l0_name,
    l1_name,
    l2_name,
    null as l0_id,
    null as l1_id,
    null as l2_id,
 	psa_code,
 	psa_name,
 	store_code,
 	store_grade,
    store_cluster,
	store_name,
	'{psa_name}'::text[] as store_hierarchy_level
from public.product_store_attributes_filter a 
union
select 
	l0_name,
    l1_name,
    l2_name,
    null as l0_id,
    null as l1_id,
    null as l2_id,
  regexp_replace(psa_code, '_' || psa_name || '$', '') as psa_code,
  psa_name,
  store_code,
  store_grade,
    store_cluster,
	store_name,
	'{}'::text[] as store_hierarchy_level
from public.product_store_attributes_filter a
;


    -- Step 3: Clear rcl_psa_config_table
    TRUNCATE TABLE "inventory_smart".rcl_psa_config_table;

    -- Step 4: Insert data into rcl_psa_config_table
    INSERT INTO "inventory_smart".rcl_psa_config_table (
        l0_name,
        l0_id,
        l1_name,
        l1_id,
        l2_name,
        l2_id,
        psa_name,
        psa_code,
        sub_psa_code,
        updated_at
    )
    SELECT DISTINCT
        l0_name,
        l0_id,
        l1_name,
        l1_id,
        l2_name,
        l2_id,
        psa_name,
        psa_code,
        psa_name,
        now()
    FROM global.product_store_attributes_filter x
    where store_hierarchy_level = '{psa_name}'::text[]
    union all
    SELECT DISTINCT
        l0_name,
        l0_id,
        l1_name,
        l1_id,
        l2_name,
        l2_id,
        null as psa_name,
        psa_code,
        'all' as sub_psa_code,
        now()
    FROM global.product_store_attributes_filter x 
    where store_hierarchy_level = '{}'
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