-- liquibase formatted sql
-- changeset surya.avinash@impactanalytics.co:sync_product_store_hierarchy_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_product_store_hierarchy_mapping
-- comment: initial changeset for sync_product_store_hierarchy_mapping_v1
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping();

CREATE OR REPLACE PROCEDURE public.sync_product_store_hierarchy_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_product_store_hierarchy_mapping';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
BEGIN
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    begin
        DELETE FROM "global".product_store_hierarchy_mapping
        WHERE true;
        
        -- Optimized: Get distinct product hierarchies and stores separately, then cross join
        INSERT INTO "global".product_store_hierarchy_mapping (
            l0_name, l1_name, l2_name, country
        )
        SELECT 
            pm.l0_cuq, 
            pm.l1_cuq, 
            pm.l2_cuq, 
            sm.s0_name
        FROM (
            SELECT DISTINCT l0_cuq, l1_cuq, l2_cuq
            FROM pricesmart.product_master
            WHERE is_active = 1
        ) pm
        CROSS JOIN (
            SELECT DISTINCT s0_name
            FROM pricesmart.tb_store_master
            WHERE is_active = 1
        ) sm;
        
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