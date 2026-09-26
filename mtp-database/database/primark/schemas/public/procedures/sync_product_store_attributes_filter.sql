--liquibase formatted sql
--changeset aman_lakkoju_:Removing_l1_name_from_sync_product_store_attributes_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Removing_l1_name_from_sync_product_store_attributes_filter
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_attributes_filter();
CREATE OR REPLACE PROCEDURE public.sync_product_store_attributes_filter()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code VARCHAR := gen_random_uuid();
    _sp_name VARCHAR := 'public.sync_product_store_attributes_filter';
    _log_step VARCHAR;
    _st TIMESTAMP := clock_timestamp();
BEGIN 
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::TEXT, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);
    
    BEGIN
        -- Clear existing data
        DELETE FROM "global".product_store_attributes_filter
        WHERE true;
        
        -- Insert new data
        INSERT INTO "global".product_store_attributes_filter(
            l0_name,
            psa_code,
            psa_name,
            region,
            store_code,
            store_hierarchy_level
        ) 	
        SELECT
            l0_name,
            psa_code,
            psa_name,
            region,
            store_code,
            store_hierarchy_level
        FROM public.product_store_attributes_filter a;

        -- Clear rcl_psa_config_table
        TRUNCATE TABLE "inventory_smart".rcl_psa_config_table;
        
        -- Insert data into rcl_psa_config_table
        INSERT INTO "inventory_smart".rcl_psa_config_table (
            l0_name,
            psa_name, 
            region,
            psa_code,
            sub_psa_code,
            updated_at
        )
        SELECT DISTINCT
            l0_name,
            CASE 
                WHEN 'store_tier' = ANY(store_hierarchy_level) THEN psa_name 
                ELSE NULL 
            END,
            CASE 
                WHEN 'region' = ANY(store_hierarchy_level) THEN region 
                ELSE NULL 
            END,
            psa_code,
            CASE 
                WHEN store_hierarchy_level = '{}' THEN 'all'
                WHEN 'region' = ANY(store_hierarchy_level) AND 'store_tier' = ANY(store_hierarchy_level) THEN psa_name || '_' || region 
                WHEN 'region' = ANY(store_hierarchy_level) THEN region
                WHEN 'store_tier' = ANY(store_hierarchy_level) THEN psa_name
                ELSE NULL
            END,
            NOW()
        FROM global.product_store_attributes_filter x
        ON CONFLICT DO NOTHING;
        
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::TEXT, NULL);
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error if an exception occurs during any part of the procedure
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::TEXT, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END
$procedure$;