--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:cleanup_constraint_master_data runOnChange:true stripComments:false splitStatements:false context:cleanup_constraint_master_data labels:project start
--comment: created procedure cleanup_constraint_master_data
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.cleanup_constraint_master_data();

CREATE OR REPLACE PROCEDURE public.cleanup_constraint_master_data()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _l0 text;
    _l1 text;
    _wk int;
    _fiscal_weeks int[];
    _partition_weeks text;
    _cleanup_count int := 0;
    _start_time timestamp;
    _end_time timestamp;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.cleanup_constraint_master_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
    _start_time := clock_timestamp();
    
   
    
    -- Step 1: Get all fiscal year weeks from constraint_master_weekly partitions
    RAISE NOTICE 'Step 1: Fetching fiscal year weeks from partitions...';
    
    SELECT 
        string_agg(
            regexp_replace(
                regexp_replace(pg_get_expr(c.relpartbound, c.oid), '.*IN\s*\((.*)\).*', '\1'),
                '''',
                '',
                'g'
            ),
            ','
        )
    INTO _partition_weeks
    FROM pg_inherits i
    JOIN pg_class c ON i.inhrelid = c.oid
    WHERE i.inhparent = 'inventory_smart.constraint_master_weekly'::regclass;
    
    IF _partition_weeks IS NOT NULL THEN
        _fiscal_weeks := string_to_array(_partition_weeks, ',')::int[];
        RAISE NOTICE 'Found % fiscal year weeks in partitions', array_length(_fiscal_weeks, 1);
    ELSE
        RAISE NOTICE 'WARNING: No fiscal year weeks found in partitions. Skipping weekly cleanup.';
        _fiscal_weeks := ARRAY[]::int[];
    END IF;
    
    -- Step 2: Cleanup inventory_smart.constraint_master (by l0_name)
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Step 2: Cleaning up inventory_smart.constraint_master';
    RAISE NOTICE '==================================================';
    
    FOR _l0 IN 
        SELECT DISTINCT l0_name 
        FROM public.constraint_master_cleanup_skus 
        WHERE l0_name IS NOT NULL
        ORDER BY l0_name
    LOOP
        RAISE NOTICE 'Processing l0_name: %', _l0;
        
        BEGIN
            PERFORM public.parellel_insert(
                'WITH rows AS (
                    DELETE FROM inventory_smart.constraint_master {where} 
                    AND l0_name = ' || quote_literal(_l0) || ' 
                    RETURNING 1
                )
                SELECT count(1) as cnt FROM rows;',
                50,
                'public.constraint_master_cleanup_skus WHERE l0_name = ' || quote_literal(_l0),
                'product_code',
                NULL,
                100
            );
            
            _cleanup_count := _cleanup_count + 1;
            RAISE NOTICE '  ✓ Completed cleanup for l0_name: %', _l0;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '  ✗ Error cleaning constraint_master for l0_name %: %', _l0, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed constraint_master cleanup for % l0 groups', _cleanup_count;
    
    -- Step 3: Cleanup inventory_smart.constraint_master_weekly (by l0_name, l1_name, fiscal_year_week)
    IF array_length(_fiscal_weeks, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '==================================================';
        RAISE NOTICE 'Step 3: Cleaning up inventory_smart.constraint_master_weekly';
        RAISE NOTICE '==================================================';
        
        _cleanup_count := 0;
        
        FOR _l0, _l1 IN 
            SELECT DISTINCT l0_name, l1_name 
            FROM public.constraint_master_cleanup_skus 
            WHERE l0_name IS NOT NULL AND l1_name IS NOT NULL
            ORDER BY l0_name, l1_name
        LOOP
            RAISE NOTICE 'Processing l0_name: %, l1_name: % across % weeks', _l0, _l1, array_length(_fiscal_weeks, 1);
            
            -- Process each fiscal week for this l0/l1 combination
            FOR _wk IN SELECT unnest(_fiscal_weeks)
            LOOP
                BEGIN
                    PERFORM public.parellel_insert(
                        'WITH rows AS (
                            DELETE FROM inventory_smart.constraint_master_weekly {where} 
                            AND l0_name = ' || quote_literal(_l0) || '
                            AND l1_name = ' || quote_literal(_l1) || '
                            AND fiscal_year_week = ' || _wk || '
                            RETURNING 1
                        )
                        SELECT count(1) as cnt FROM rows;',
                        50,
                        'public.constraint_master_cleanup_skus WHERE l0_name = ' || quote_literal(_l0) || 
                        ' AND l1_name = ' || quote_literal(_l1),
                        'product_code',
                        NULL,
                        100
                    );
                    
                EXCEPTION WHEN OTHERS THEN
                    RAISE WARNING '  ✗ Error cleaning constraint_master_weekly for l0=%, l1=%, week=%: %', 
                        _l0, _l1, _wk, SQLERRM;
                END;
            END LOOP;
            
            _cleanup_count := _cleanup_count + 1;
            RAISE NOTICE '  ✓ Completed weekly cleanup for l0_name: %, l1_name: %', _l0, _l1;
        END LOOP;
        
        RAISE NOTICE 'Completed constraint_master_weekly cleanup for % l0/l1 groups', _cleanup_count;
    ELSE
        RAISE NOTICE 'Skipping Step 3 (no fiscal weeks found)';
    END IF;
    
    -- Step 4: Cleanup global.product_mapping_product_store (by l0_name)
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Step 4: Cleaning up global.product_mapping_product_store';
    RAISE NOTICE '==================================================';
    
    _cleanup_count := 0;
    
    FOR _l0 IN 
        SELECT DISTINCT l0_name 
        FROM public.constraint_master_cleanup_skus 
        WHERE l0_name IS NOT NULL
        ORDER BY l0_name
    LOOP
        RAISE NOTICE 'Processing l0_name: %', _l0;
        
        BEGIN
            PERFORM public.parellel_insert(
                'WITH rows AS (
                    DELETE FROM global.product_mapping_product_store {where} 
                    AND l0_name = ' || quote_literal(_l0) || '
                    RETURNING 1
                )
                SELECT count(1) as cnt FROM rows;',
                50,
                'public.constraint_master_cleanup_skus WHERE l0_name = ' || quote_literal(_l0),
                'product_code',
                NULL,
                100
            );
            
            _cleanup_count := _cleanup_count + 1;
            RAISE NOTICE '  ✓ Completed cleanup for l0_name: %', _l0;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '  ✗ Error cleaning product_mapping_product_store for l0_name %: %', _l0, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed product_mapping_product_store cleanup for % l0 groups', _cleanup_count;
    

    RAISE NOTICE 'Cleanup process completed successfully!';

    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Fatal error in cleanup_constraint_master_data: %', SQLERRM;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
END;
$procedure$
;
