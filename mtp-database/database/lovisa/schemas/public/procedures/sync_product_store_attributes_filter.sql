--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_product_store_attributes_filter runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:briscoes_sync_product_store_attributes_filter
--comment: initial changeset for sync_product_store_attributes_filter
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
BEGIN 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    -- Step 1: Clear rcl_psa_config_table
    TRUNCATE TABLE "inventory_smart".rcl_psa_config_table;

    -- Step 2: Insert data into rcl_psa_config_table
    INSERT INTO "inventory_smart".rcl_psa_config_table (
        l0_name,
        psa_name,
        psa_code,
        sub_psa_code,
        updated_at
    )
    SELECT DISTINCT
        l0_name,
        psa_name,
        psa_code,
        psa_name,
        now()
    FROM global.product_store_attributes_filter x
    where store_hierarchy_level = '{psa_name}'::text[]
    union all
    SELECT DISTINCT
        l0_name,
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
	END
$procedure$
;