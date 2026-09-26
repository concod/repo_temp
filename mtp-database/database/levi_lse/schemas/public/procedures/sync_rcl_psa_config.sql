--liquibase formatted sql
--changeset himansh.bhardwaj@impactanalytics.co:sync_rcl_psa_config_v1 runOnChange:true stripComments:false splitStatements:false context:ReleASe_1.1 labels:sync_product_store_attributes_filter
--comment: initial changeset v1

DROP PROCEDURE if exists public.sync_rcl_psa_config();
CREATE OR REPLACE PROCEDURE public.sync_rcl_psa_config()
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
        updated_at,
        country_id,
        franchise_name
    )
    -- psa_name
    SELECT DISTINCT
        l0_name,
        NULL AS l0_id,
        l1_name,
        NULL AS l1_id,
        l2_name,
        NULL AS l2_id,
        psa_name,
        psa_code,
        psa_name AS sub_psa_code,
        now(),
        NULL AS country_id,
        NULL AS franchise_name
    FROM global.product_store_attributes_filter x
    where store_hierarchy_level = '{psa_name}'::text[]

    union all

    -- franchise_name
    SELECT DISTINCT
        l0_name,
        NULL AS l0_id,
        l1_name,
        NULL AS l1_id,
        l2_name,
        NULL AS l2_id,
        NULL AS psa_name,
        psa_code,
        franchise_name AS sub_psa_code,
        now(),
        NULL AS country_id,
        franchise_name
    FROM global.product_store_attributes_filter x 
    where store_hierarchy_level = '{franchise_name}'::text[]

    union all

    -- country_id
    SELECT DISTINCT
        l0_name,
        NULL AS l0_id,
        l1_name,
        NULL AS l1_id,
        l2_name,
        NULL AS l2_id,
        NULL AS psa_name,
        psa_code,
        country_id AS sub_psa_code,
        now(),
        country_id,
        NULL AS franchise_name
    FROM global.product_store_attributes_filter x 
    where store_hierarchy_level = '{country_id}'::text[]

    union all

    -- psa_name + franchise_name
    SELECT DISTINCT
        l0_name,
        NULL AS l0_id,
        l1_name,
        NULL AS l1_id,
        l2_name,
        NULL AS l2_id,
        psa_name,
        psa_code,
        CONCAT(psa_name,'_',franchise_name) AS sub_psa_code,
        now(),
        NULL AS country_id,
        franchise_name
    FROM global.product_store_attributes_filter x 
    where store_hierarchy_level = '{psa_name,franchise_name}'::text[]

    union all 

    -- franchise_name + country_id
    SELECT DISTINCT
        l0_name,
        NULL AS l0_id,
        l1_name,
        NULL AS l1_id,
        l2_name,
        NULL AS l2_id,
        NULL AS psa_name,
        psa_code,
        CONCAT(franchise_name,'_',country_id) AS sub_psa_code,
        now(),
        country_id,
        franchise_name
    FROM global.product_store_attributes_filter x 
    where store_hierarchy_level = '{franchise_name,country_id}'::text[]

    union all

    -- psa_name + country_id
    SELECT DISTINCT
        l0_name,
        NULL AS l0_id,
        l1_name,
        NULL AS l1_id,
        l2_name,
        NULL AS l2_id,
        psa_name,
        psa_code,
        CONCAT(psa_name,'_',country_id) AS sub_psa_code,
        now(),
        country_id,
        NULL AS franchise_name
    FROM global.product_store_attributes_filter x 
    where store_hierarchy_level = '{psa_name,country_id}'::text[]

    union all

    -- psa_name + franchise_name + country_id
    SELECT DISTINCT
        l0_name,
        NULL AS l0_id,
        l1_name,
        NULL AS l1_id,
        l2_name,
        NULL AS l2_id,
        psa_name,
        psa_code,
        CONCAT(psa_name,'_',franchise_name,'_',country_id) AS sub_psa_code,
        now(),
        country_id,
        franchise_name
    FROM global.product_store_attributes_filter x 
    where store_hierarchy_level = '{psa_name,franchise_name,country_id}'::text[]

    union all 
    
    -- all
    SELECT DISTINCT
        l0_name,
        NULL AS l0_id,
        l1_name,
        NULL AS l1_id,
        l2_name,
        NULL AS l2_id,
        NULL AS psa_name,
        psa_code,
        'all' AS sub_psa_code,
        now(),
        NULL AS country_id,
        NULL AS franchise_name
    FROM global.product_store_attributes_filter x 
    where store_hierarchy_level = '{all}'::text[]
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
