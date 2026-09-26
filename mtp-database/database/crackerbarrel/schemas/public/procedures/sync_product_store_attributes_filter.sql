--liquibase formatted sql
--changeset aman_lakkoju:Removing l2_name from sync_product_store_attributes_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Removing l2_name from sync_product_store_attributes_filter
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_product_store_attributes_filter();
CREATE OR REPLACE PROCEDURE public.sync_product_store_attributes_filter()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_attributes_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _worker text;
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        select async_query into _worker from public.async_query('truncate global.product_store_attributes_filter;');
        perform public.async_query_status(_worker, 'cleanup');
        select async_query into _worker from public.async_query('alter table public.product_store_attributes_filter add column if not exists unique_id serial not null;');
        perform public.async_query_status(_worker, 'cleanup');
        perform public.parellel_insert('WITH rows AS (
 		INSERT INTO "global".product_store_attributes_filter(
	l0_name,
    l1_name,
    l2_name,
    primary_trait_desc,
    l3_name,
 	psa_code,
 	psa_name,
 	store_code,
	store_hierarchy_level
 		) 
 		
select
	l0_name,
	l1_name,
    l2_name,
    primary_trait_desc,
    l3_name,
 	psa_code,
 	psa_name,
 	store_code,
	''{psa_name}''::text[] as store_hierarchy_level
from public.product_store_attributes_filter a {where}
union
select 
	l0_name,
	l1_name,
    l2_name,
    primary_trait_desc,
    l3_name,
	regexp_replace(psa_code, ''_'' || psa_name || ''$'', '''') as psa_code,
	psa_name,
	store_code,
	''{}''::text[] as store_hierarchy_level
from public.product_store_attributes_filter a {where} RETURNING 1) 
	SELECT 
	  count(1) as cnt 
	FROM 
	  rows;', 50, 'public.product_store_attributes_filter', 'unique_id', null, 5000);

raise notice '=================================PSAF UPDATED ======================================';
-- Step 3: Clear rcl_psa_config_table
       TRUNCATE TABLE "inventory_smart".rcl_psa_config_table;
       
       -- Step 4: Insert data into rcl_psa_config_table
       INSERT INTO "inventory_smart".rcl_psa_config_table (
           l0_name,
           l1_name,
           l2_name,
           primary_trait_desc,
           l3_name,
           psa_name,
           psa_code,
           sub_psa_code,
           updated_at
       )
       SELECT DISTINCT
           l0_name,
           l1_name,
           l2_name,
           primary_trait_desc,
           l3_name,
           psa_name,
           psa_code,
           psa_name,
           now()
       FROM global.product_store_attributes_filter x
       where store_hierarchy_level = '{psa_name}'::text[]
       union
       SELECT DISTINCT
           l0_name,
           l1_name,
           l2_name,
           primary_trait_desc,
           l3_name,
           null as psa_name,
           psa_code,
           'all' as sub_psa_code,
           now()
       FROM global.product_store_attributes_filter x 
       where store_hierarchy_level = '{}'
       ON CONFLICT DO nothing;
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