--liquibase formatted sql
--changeset sreevathsa.sp:sync_product_mapping_product_store_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_product_mapping_product_store
--comment: initial changeset for sync_product_mapping_product_store
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_mapping_product_store();

CREATE OR REPLACE PROCEDURE public.sync_product_mapping_product_store()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_product_mapping_product_store';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
    _worker   text;
BEGIN
    -- start log
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -- Step 1: Create partitions for all l0_name values
        _log_step := 'create_partitions';
        raise notice 'step_01_start_partitions:%',(clock_timestamp() - _st);
        
        -- Create partitions for each distinct l0_name
        PERFORM public.async_query('
            DO $$
            DECLARE
                l0_rec RECORD;
            BEGIN
                FOR l0_rec IN 
                    SELECT DISTINCT l0_name 
                    FROM "global".product_attributes_filter 
                    WHERE active AND NOT is_deleted
                LOOP
                    EXECUTE format(''CREATE TABLE IF NOT EXISTS "global".product_mapping_product_store_%s 
                        PARTITION OF "global".product_mapping_product_store 
                        FOR VALUES IN (%L)'', 
                        replace(l0_rec.l0_name, '' '', ''_''), 
                        l0_rec.l0_name);
                END LOOP;
            END $$;
        ');
        
        raise notice 'step_01_end_partitions:%',(clock_timestamp() - _st);
        
        -- Step 2: Parallel upsert
        _log_step := 'parallel_upsert';
        raise notice 'step_02_start:%',(clock_timestamp() - _st);
        perform public.parellel_insert(
            'WITH rows AS (
                INSERT INTO "global".product_mapping_product_store (
                    mapping_type,
                    l0_name,
                    product_code,
                    store_code,
                    is_active
                )
                SELECT DISTINCT
                    ''product-store''::text AS mapping_type,
                    paf.l0_name AS l0_name,
                    paf.product_code AS product_code,
                    saf.store_code AS store_code,
                    true AS is_active
                FROM (
                    SELECT DISTINCT
                        paf.product_code,
                        paf.l0_name
                    FROM "global".product_attributes_filter paf
                    {where}
                      AND paf.active
                      AND NOT paf.is_deleted
                      
                ) paf
                CROSS JOIN (
                    SELECT DISTINCT
                        saf.store_code
                    FROM "global".store_attributes_filter saf
                    WHERE saf.active
                      AND NOT saf.is_deleted
                ) saf
                ON CONFLICT (l0_name, product_code, store_code)
                DO UPDATE
                SET
                    mapping_type = EXCLUDED.mapping_type,
                    is_active    = EXCLUDED.is_active
                RETURNING 1
            )
            SELECT count(1) as cnt FROM rows;',
            50,
            'global.product_attributes_filter',
            'l0_name',
            'paf_l0_name_idx',
            30
        );
        raise notice 'step_02_end:%',(clock_timestamp() - _st);
        
        -- end log
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$;
