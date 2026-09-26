--liquibase formatted sql
--changeset liquibase:sync_psaf_vs_intl_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_psaf1

DROP PROCEDURE IF EXISTS public.sync_product_store_attributes_filter();

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
        -- Step 1: Clear product_store_attributes_filter
        
	 	delete from "global".product_store_attributes_filter
	 	where true;
	 
        -- Step 2: Insert data into product_store_attributes_filter
 		INSERT INTO "global".product_store_attributes_filter(
 		psa_code,
 		psa_name,
 		store_code,
 		l0_id,
 		l0_name,
 		l3_id,
 		l3_name,
 		l4_id,
 		l4_name,
 		l5_id,
 		l5_name,
 		l6_id,
 		l6_name,
		vsba_regional_dc_descr,
		terminal_flag,
		store_hierarchy_level
 		)
 		SELECT 
 		psa_code,
 		psa_name,
 		store_code,
 		l0_id,
 		l0_name,
 		l3_id,
 		l3_name,
 		l4_id,
 		l4_name,
 		l5_id,
 		l5_name,
 		l6_id,
 		l6_name,
		vsba_regional_dc_descr,
		terminal_flag,
		'{psa_name}'::text[] as store_hierarchy_level
 		FROM 
 		  public.product_store_attributes_filter x 
          union
          SELECT 
        regexp_replace(psa_code, '_' || psa_name || '$', '') as psa_code,
        psa_name,
        store_code,
        l0_id,
        l0_name,
        l3_id,
        l3_name,
        l4_id,
        l4_name,
        l5_id,
        l5_name,
        l6_id,
        l6_name,
		vsba_regional_dc_descr,
		terminal_flag,
		'{}'::text[] as store_hierarchy_level
    FROM public.product_store_attributes_filter x
 		  on conflict do nothing
 	;

    -- Step 3: Clear rcl_psa_config_table
    TRUNCATE TABLE "inventory_smart".rcl_psa_config_table;

    -- Step 4: Insert data into rcl_psa_config_table
    INSERT INTO "inventory_smart".rcl_psa_config_table (
        l0_name,
        l0_id,
        psa_name,
        psa_code,
        sub_psa_code,
        updated_at
    )
    SELECT DISTINCT
        l0_name,
        l0_id,
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