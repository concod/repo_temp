--liquibase formatted sql
--changeset himansh.bhardwaj:changed the public table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: changed the public table
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_store_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_store_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_product_store_mapping';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
begin
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    
    begin
        _log_step := 'delete_inactive_records';
        -- Delete records in target that are not present in source
        -- Using tuple comparison (l0_name, product_code, store_code) which is safer than concat
        call global.build_list_partitions('product_mapping_product_store');
        DELETE FROM global.product_mapping_product_store
        WHERE (l0_name, product_code, store_code) NOT IN (
            SELECT distinct l0_name, product_code, store_code
            FROM public.product_mapping_product_store_validated_table
        );
        
        _log_step := 'upsert_records';
        -- Upsert query
        INSERT INTO global.product_mapping_product_store(
            mapping_type, l0_name, product_code, store_code, is_active
        )
        SELECT 
            'product_store', l0_name, product_code, store_code, true as is_active
        FROM public.product_mapping_product_store_validated_table
        ON CONFLICT (l0_name, product_code, store_code)
        DO UPDATE 
        SET 
            is_active = EXCLUDED.is_active,
            updated_at = now();

        call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
        
    exception
        when others then
            -- Log the error if an exception occurs during any part of the procedure
            call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
    end;
end
$procedure$;