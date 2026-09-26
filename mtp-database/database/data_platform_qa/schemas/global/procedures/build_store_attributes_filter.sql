--liquibase formatted sql
--changeset liquibase:build_store_attributes_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_store_attributes_filter
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_store_attributes_filter(IN _store_code varchar);
DROP PROCEDURE IF EXISTS global.build_store_attributes_filter();
CREATE OR REPLACE PROCEDURE global.build_store_attributes_filter(IN _store_code character varying)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _sql text;
    _final_cols_list text;
    _final_cols_list_excluded text;
    _final_cols_list_sa text;
    _final_cols_list_saf text;
    _sync_sql text;
    _worker text;
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'global.build_store_attributes_filter';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _attributes_sql text;
    _store_master_cols text;
    _filtered_attributes text;
BEGIN
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    
    BEGIN
        /* ------------------------------------------------------------------------
        -------------------------- Get required cols list -------------------------
        ------------------------------------------------------------------------ */
        -- Get store_master columns
        SELECT string_agg(column_name, ', ') INTO _store_master_cols
        FROM information_schema.columns
        WHERE table_name = 'store_master' AND table_schema = 'global';
        
        -- Get attributes not in store_master
        SELECT string_agg(x.generic_column_name, ', ') INTO _filtered_attributes
        FROM (
            SELECT 
                generic_column_name
            FROM 
                global.store_generic_schema_mapping 
            WHERE 
                required_in_product
                AND is_attribute
                AND generic_column_name NOT IN (
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'store_master' 
                    AND table_schema = 'global'
                )
        ) x;
        
        -- List of all columns for final table
        SELECT 
            string_agg('"' || generic_column_name || '"', ', '), 
            string_agg(concat('excluded.', '"' || generic_column_name || '"'), ', '),
            string_agg(concat('sa.', '"' || generic_column_name || '"'), ', '),
            string_agg(concat('saf.', '"' || generic_column_name || '"'), ', ') 
        INTO 
            _final_cols_list, 
            _final_cols_list_excluded, 
            _final_cols_list_sa,
            _final_cols_list_saf
        FROM (
            SELECT 
                generic_column_name
            FROM 
                global.store_generic_schema_mapping 
            WHERE 
                required_in_product
            UNION 
            SELECT 
                column_name AS generic_column_name 
            FROM 
                information_schema."columns" c 
            WHERE 
                table_name = 'store_master' 
                AND table_schema = 'global'
        ) x;
        
        -- Create dynamic SQL for attributes joins
        SELECT 
            string_agg(_tsql, ' ') 
        INTO _attributes_sql
        FROM (
            SELECT 
                'LEFT JOIN (SELECT store_code, attribute_value::' || _attr_dt || ' AS ' || _attr || 
                ' FROM global.store_attributes WHERE attribute_name = ''' || _attr || ''') X' || _counter || ' USING(store_code)' AS _tsql 
            FROM (
                SELECT 
                    generic_column_name AS _attr, 
                    generic_column_datatype AS _attr_dt, 
                    row_number() OVER () AS _counter 
                FROM 
                    global.store_generic_schema_mapping sgsm 
                WHERE 
                    required_in_product 
                    AND is_attribute
                    AND generic_column_name NOT IN (
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'store_master' 
                        AND table_schema = 'global'
                    )
                ORDER BY 
                    hierarchy_level ASC NULLS LAST
            ) x
        ) x;
        
        /* ------------------------------------------------------------------------
        ------------------------------- Ingestion ---------------------------------
        ------------------------------------------------------------------------ */
        _log_step := 'saf delta calculate';
        
        -- Create tables for delta calculations
        SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.saf_delete, public.new_saf, public.new_saf_delta;');
        PERFORM public.async_query_status(_worker, 'cleanup');

        -- Create the SQL for the new_saf table with no duplicate columns
        _sql := 'CREATE TABLE public.new_saf AS SELECT sm.*, ' || COALESCE(_filtered_attributes, '1 as dummy') || 
                ' FROM global.store_master sm ' || COALESCE(_attributes_sql, '');
                
        RAISE NOTICE '_sql: %', _sql;
        SELECT async_query INTO _worker FROM public.async_query(_sql);
        PERFORM public.async_query_status(_worker, 'cleanup');

        -- For delta calculation, select all columns from new_saf
        _sql := 'SELECT ' || _final_cols_list_sa || '
        FROM public.new_saf sa LEFT JOIN global.store_attributes_filter saf USING(store_code)
        WHERE (' || _final_cols_list_sa || ') IS DISTINCT FROM (' || _final_cols_list_saf || ')';
        
        SELECT async_query INTO _worker FROM public.async_query('CREATE TABLE public.new_saf_delta AS ' || _sql);
        PERFORM public.async_query_status(_worker, 'cleanup');
        
        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
        
        ------------------------------------------------------------------------
        
        _sql := replace(_sql, 'WHERE', '{where} AND ');
        _log_step := 'saf upsert';
        perform set_config('local.log_step', _log_step, true);
        
        _sync_sql := 'INSERT INTO global.store_attributes_filter (' || _final_cols_list || ') 
        WITH sa AS MATERIALIZED (
            ' || _sql || '
        ),
        saf AS MATERIALIZED (
            SELECT * FROM global.store_attributes_filter {where}
        )
        SELECT ' || _final_cols_list_sa || '
        FROM sa LEFT JOIN saf USING(store_code)
        ON CONFLICT(store_code) DO 
        UPDATE 
        SET (' || _final_cols_list || ') = (' || _final_cols_list_excluded || ')';
        
        RAISE NOTICE '_sync_sql: %', _sync_sql;
        
        PERFORM public.parellel_insert('WITH rows AS (
            ' || _sync_sql || '
            RETURNING 1
        ) 
        SELECT 
            count(1) AS cnt 
        FROM 
            rows;', 50, 'global.store_master', 'store_code', null, 2000);
            
        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
        
        /* ------------------------------------------------------------------------
        ----------------------- Remove deleted/inactive stores --------------------
        ------------------------------------------------------------------------ */
        _log_step := 'calculate stores to delete';
        perform set_config('local.log_step', _log_step, true);
        
        _sql := 'CREATE TABLE public.saf_delete AS 
        SELECT 
            store_code
        FROM 
            global.store_attributes_filter saf 
        WHERE 
            NOT EXISTS(
                SELECT 
                    1 
                FROM 
                    global.store_attributes sa 
                WHERE 
                    attribute_name = ''s0_name'' 
                    AND saf.store_code = sa.store_code
            );';
            
        SELECT async_query INTO _worker FROM public.async_query(_sql);
        PERFORM public.async_query_status(_worker, 'cleanup');
        
        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
        
        ------------------------------------------------------------------------
        
        _log_step := 'deleting inactive stores';
        perform set_config('local.log_step', _log_step, true);
        
        _sql := 'WITH rows AS (
        DELETE FROM 
            global.store_attributes_filter saf {where} 
            AND EXISTS(
                SELECT 
                    1 
                FROM 
                    public.saf_delete sd 
                WHERE 
                    saf.store_code = sd.store_code
            ) RETURNING 1
        ) 
        SELECT 
            count(1) AS cnt 
        FROM 
            rows;';
            
        PERFORM public.parellel_insert(_sql, 50, 'public.saf_delete', 'store_code', 'saf_delete_store_code_pk', 500);
        
        call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
        
        -- Note: Not cleaning up temp tables as they're passed to parallel_insert function
        
    EXCEPTION
        WHEN OTHERS THEN
            call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END;
$procedure$
;
