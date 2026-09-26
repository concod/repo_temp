--liquibase formatted sql
--changeset himansh.bhardwaj@impactanalytics.co:active_is_not_deleted_skus_partitions runOnChange:true stripComments:false splitStatements:false context:generate_all_rcl_constraint_data labels:project start
--comment: only creating partitions for active / not_deleted skus
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.generate_all_rcl_constraint_data();
CREATE OR REPLACE PROCEDURE public.generate_all_rcl_constraint_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE 
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.generate_all_rcl_constraint_data';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _l0_name text;
    _l1_name text;
    _l2_name text;
    _sql text;
    _temp_hash text;
    _part_sql text[] := array[]::text[];
    _base_data_sql text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);
    
    BEGIN
        EXECUTE 'TRUNCATE TABLE inventory_smart.final_result_table';
        
        _base_data_sql := $$
            CREATE TEMP TABLE base_product_store_data ON COMMIT DROP AS
            SELECT DISTINCT 
                paf.l0_name,
                paf.l1_name, 
                paf.l2_name,
                dpi.product_code::text as product_code, 
                dpi.store_code::text as store_code
            FROM (
                SELECT DISTINCT l0_name, l1_name, l2_name, psaf.store_code 
                FROM global.product_store_attributes_filter psaf 
                JOIN global.store_master sm USING(store_code)
                WHERE active AND NOT is_deleted
            ) x 
            JOIN global.product_attributes_filter paf USING(l0_name, l1_name, l2_name)
            JOIN inventory_smart.product_profile_mapping dpi USING(l0_name, product_code, store_code)
            WHERE active AND NOT is_deleted;
        $$;
        
        RAISE NOTICE 'Creating base product store data table';
        EXECUTE _base_data_sql;
        
        EXECUTE 'CREATE INDEX idx_base_l0_l1_l2 ON base_product_store_data(l0_name, l1_name, l2_name)';
        EXECUTE 'CREATE INDEX idx_base_product_store ON base_product_store_data(product_code, store_code)';
        
        FOR _l0_name, _l1_name, _l2_name IN 
            SELECT l0_name, l1_name, l2_name 
            FROM global.product_attributes_filter paf 
            WHERE active AND NOT is_deleted 
            GROUP BY 1,2,3 
            ORDER BY 1,2,3 
        LOOP
            _temp_hash := md5(_l0_name || '-' || _l1_name || '-' || _l2_name);
            
            _sql := format($$
                CREATE TEMP TABLE "test_%4$s" ON COMMIT DROP AS
                SELECT product_code, store_code 
                FROM base_product_store_data
                WHERE l0_name = '%1$s'
                  AND l1_name = '%2$s' 
                  AND l2_name = '%3$s'
            $$, _l0_name, _l1_name, _l2_name, _temp_hash);
            
            RAISE NOTICE 'Creating temp table for: %s-%s-%s', _l0_name, _l1_name, _l2_name;
            EXECUTE _sql;
            
            _part_sql := array_append(_part_sql, 
                'SELECT * FROM inventory_smart.generate_rcl_constraint_data_v2(' || 
                quote_literal(_l0_name) || ', ' || 
                quote_literal('test_' || _temp_hash) || ')');
        END LOOP;
        
        RAISE NOTICE 'Processing % (l0,l1,l2) combinations in batch', cardinality(_part_sql);
        
        IF cardinality(_part_sql) > 0 THEN
            SET enable_seqscan = off;
            EXECUTE 'INSERT INTO inventory_smart.final_result_table ' || 
                    ARRAY_TO_STRING(_part_sql, ' UNION ALL ', '');
        END IF;
        
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
        
    EXCEPTION
        WHEN others THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END
$procedure$
;