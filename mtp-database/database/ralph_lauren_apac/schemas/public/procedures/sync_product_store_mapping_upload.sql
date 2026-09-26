--liquibase formatted sql
--changeset kuldeep.rathore:Adding l0_name and removing mapping_code MTP-64122 runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-64122
--comment: Adding l0_name and removing mapping_code MTP-64122
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_product_store_mapping_upload();
CREATE OR REPLACE PROCEDURE public.sync_product_store_mapping_upload()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_mapping_upload';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Insert into "global".product_mapping_product_store
    INSERT INTO "global".product_mapping_product_store (
        mapping_type, 
        l0_name, 
        product_code, 
        store_code, 
        is_active, 
        validity, 
        updated_by, 
        inv_source_flag, 
        updated_at, 
        creation_source_id, 
        current_updation_id
    ) 
    SELECT 
        mapping_type, 
        l0_name, 
        product_code, 
        store_code, 
        is_active, 
        CASE 
            WHEN is_active = TRUE THEN range_agg(daterange(validity_start_date, validity_end_date))
            ELSE NULL 
        END AS validity, 
        created_by AS updated_by, 
        inv_source_flag, 
        updated_at, 
        2 AS creation_source_id, 
        2 AS current_updation_id
    FROM 
        public.psm_delta x
    GROUP BY 
        mapping_type, 
        l0_name, 
        product_code, 
        store_code, 
        is_active, 
        created_by, 
        inv_source_flag, 
        updated_at
    ON CONFLICT (l0_name, product_code, store_code) 
    DO UPDATE
    SET 
        is_active = EXCLUDED.is_active, 
        validity = EXCLUDED.validity,
        updated_by = EXCLUDED.updated_by,
        inv_source_flag = EXCLUDED.inv_source_flag,
        updated_at = EXCLUDED.updated_at,
        creation_source_id = EXCLUDED.creation_source_id,
        current_updation_id = EXCLUDED.current_updation_id;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;