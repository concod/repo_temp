--liquibase formatted sql
--changeset aman_lakkoju:added rule_store_mappint_delta table sync_article_store_grade runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added rule_store_mappint_delta table 
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_article_store_grade();
CREATE OR REPLACE PROCEDURE public.sync_article_store_grade(IN _is_historic boolean DEFAULT false)
LANGUAGE plpgsql
AS $procedure$
DECLARE 
    _worker text;
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_article_store_grade';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
BEGIN 
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        IF _is_historic THEN
            SELECT async_query INTO _worker
            FROM public.async_query('TRUNCATE inventory_smart.article_store_grade;');
            
            PERFORM public.async_query_status(_worker, 'cleanup');
            RAISE NOTICE 'Step1: %', (clock_timestamp() - _st);
        END IF;

        PERFORM public.parellel_insert(
        'WITH rows AS (
            INSERT INTO inventory_smart.article_store_grade
            (
                article,
                store_code,
                grade,
                ph_code
            )
            SELECT
                a.article,
                a.store_code,
                COALESCE(d.psa_name, ''-'') AS grade,
                c.ph_code
            FROM (
                SELECT DISTINCT
                    psa_name AS store_code,
                    article
                FROM public.rule_store_mapping_delta {where}
            ) a
            INNER JOIN (
                SELECT DISTINCT
                    article,
                    l3_name
                FROM global.product_attributes_filter paf
                WHERE active
            ) b
                USING (article)
            INNER JOIN (
                SELECT DISTINCT
                    hierarchy_code AS ph_code,
                    path->>''article'' AS article
                FROM (
                    SELECT
                        hierarchy_level AS level
                    FROM global.product_generic_schema_mapping
                    WHERE generic_column_name = ''article''
                ) x
                JOIN global.product_hierarchies_filter phf
                    USING (level)
                JOIN public.rule_store_mapping_delta b
                    ON path->>''article'' = b.article
                WHERE active = TRUE
            ) c
                USING (article)
            INNER JOIN (
                SELECT DISTINCT
                    l3_name,
                    store_code,
                    psa_name
                FROM global.product_store_attributes_filter
            ) d
                ON a.store_code = d.store_code
               AND b.l3_name = d.l3_name
            ON CONFLICT (ph_code, store_code) DO NOTHING
            RETURNING 1
        )
        SELECT COUNT(1) AS cnt
        FROM rows;',
        50,
        'public.rule_store_mapping_delta',
        'psa_code',
        'rule_store_mapping_delta_delta_psa_code_idx',
        5
        );

        RAISE NOTICE 'Step2: %', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END
$procedure$;