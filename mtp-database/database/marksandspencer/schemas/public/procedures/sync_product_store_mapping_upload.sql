--liquibase formatted sql
--changeset sri.harsha:sync_product_store_mapping_upload_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:45678
--comment: updating SP for sync_product_store_mapping_upload_2

DROP PROCEDURE IF EXISTS public.sync_product_store_mapping_upload();
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

    CALL global.build_list_partitions('product_mapping_product_store');


    DELETE FROM "global".product_mapping_product_store pmps
    USING public.product_store_mapping_upload psm
    WHERE psm.updated_action = 'DELETE_SPECIFIC'
      AND psm.product_code = pmps.product_code
      AND psm.store_code = pmps.store_code;

    DELETE FROM "global".product_mapping_product_store pmps
    USING public.product_store_mapping_upload psm
    WHERE psm.updated_action = 'DELETE_STORE'
      AND psm.store_code = pmps.store_code
      AND psm.product_code IS NULL;  


    DELETE FROM "global".product_mapping_product_store pmps
    USING public.product_store_mapping_upload psm
    WHERE psm.updated_action = 'DELETE_PRODUCT'
      AND psm.product_code = pmps.product_code
      AND psm.store_code IS NULL;  


    DELETE FROM "global".product_mapping_product_store pmps
    USING public.product_store_mapping_upload psm
    WHERE psm.updated_action IN ('INSERT', 'UPDATE')
      AND psm.product_code = pmps.product_code
      AND psm.store_code = pmps.store_code;


    INSERT INTO "global".product_mapping_product_store (
        mapping_type, l0_name, product_code, store_code, 
        is_active, validity
    ) 
    SELECT 
        psm.mapping_type, 
        psm.l0_name, 
        psm.product_code, 
        psm.store_code, 
        psm.is_active, 
        range_agg(
            daterange(psm.validity_start_date, psm.validity_end_date)
        ) AS validity 
    FROM 
        public.product_store_mapping_upload psm
    WHERE psm.updated_action IN ('INSERT', 'UPDATE')
    GROUP BY 
        psm.mapping_type, 
        psm.l0_name, 
        psm.product_code, 
        psm.store_code, 
        psm.is_active
    ON CONFLICT DO NOTHING;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;
