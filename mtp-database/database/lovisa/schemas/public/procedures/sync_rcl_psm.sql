--liquibase formatted sql
--changeset aleena.reji@impactanalytics.co:sync_rcl_psm_v2 runOnChange:true stripComments:false splitStatements:false context:sync_rcl_psm_v2 labels:project start
--comment: created procedure sync_rcl_psm_v2
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_rcl_psm();

CREATE OR REPLACE PROCEDURE public.sync_rcl_psm()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code   VARCHAR := gen_random_uuid();
    _sp_name    VARCHAR := 'public.sync_rcl_psm';
    _log_step   VARCHAR;
    _st         TIMESTAMP := clock_timestamp();
    _curr_time  TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::TIME;
    _rcl_code   INT;
    _rcl_dt     TEXT;
    _rcl_jsonb  TEXT;
    _sql        TEXT;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);

    PERFORM set_config('local.log_code', _log_code, TRUE);
    PERFORM set_config('local.sp_name', _sp_name, TRUE);

    --------------------------------------------------------------------
    -- TIME WINDOW CHECK
    --------------------------------------------------------------------
    IF (_curr_time >= TIME '23:00' OR _curr_time <= TIME '04:30') THEN

        ----------------------------------------------------------------
        -- MAIN LOGIC
        ----------------------------------------------------------------
        BEGIN

            WITH cte AS (
                SELECT * FROM (
                    SELECT array_agg(rcl_dimension ORDER BY rcl_dimension)::varchar[] AS level, rcl_code
                    FROM (
                        SELECT jsonb_object_keys(concat('{"',
                                        replace(replace(rcl_dimension,'::','":"'),';;','","'),
                                        '"}')::jsonb) AS rcl_dimension,
                               rcl_code
                        FROM public.rule_store_mapping
                        WHERE action_type = 'insert'
                        GROUP BY 1,2
                    ) b
                    GROUP BY 2
                ) r
                JOIN global.rcl_priority_mapping rpm USING(level)
                WHERE module_code = 101
            )
            INSERT INTO global.rcl_master
            SELECT rcl_code, 101, "level", '{}',
                   '{[2024-01-01,2050-12-31)}', rcl_priority,
                   FALSE, 1, NULL, NOW(), NULL
            FROM cte
            ON CONFLICT DO NOTHING;

            DELETE FROM global.rcl_product_mapping_product_store
            WHERE updated_at IS NULL AND rcl_code = 32;

            DELETE FROM global.rcl_product_mapping_product_store_rule 
            WHERE rule_code NOT IN (SELECT DISTINCT rule_code FROM global.rcl_product_mapping_product_store);

            CALL public.update_rcl_product_mapping_product_store_rule();

            FOR _rcl_code, _rcl_dt, _rcl_jsonb IN
                SELECT x.rcl_code,
                       string_agg(x.level || ' ' || y.generic_column_datatype, ', '),
                       string_agg(quote_literal(x.level) || ', ' || x.level, ', ')
                FROM (
                    SELECT rcl_code, unnest(level) AS level
                    FROM global.rcl_master
                ) x
                JOIN global.product_generic_schema_mapping y
                    ON x.level = y.generic_column_name
                GROUP BY 1
            LOOP

                EXECUTE '
                    CREATE TEMP TABLE rcl_psm_master_rule_' || _rcl_code || '
                    ON COMMIT DROP AS
                    SELECT 
                        rcl_code,
                        psa_code,
                        psa_name,
                        validity,
                        jsonb_build_object(' || _rcl_jsonb || ') AS rcl_dimension
                    FROM (
                        SELECT concat(''{"'',
                                       replace(replace(rcl_dimension,''::'',''":"''),'';;'',''","''),
                                       ''"}'')::jsonb AS rcl_dimension,
                               rcl_code,
                               psa_code,
                               psa_name,
                               range_agg(daterange(start_date::date,end_date::date)) AS validity
                        FROM public.rule_store_mapping
                        WHERE rcl_code = ' || _rcl_code || '
                        GROUP BY rcl_dimension, rcl_code, psa_code, psa_name
                    ) x,
                    jsonb_to_record(rcl_dimension) AS (' || _rcl_dt || ');
                ';

                EXECUTE '
                    INSERT INTO global.rcl_product_mapping_product_store_rule
                        (rcl_code, rcl_dimension)
                    SELECT rcl_code, rcl_dimension
                    FROM rcl_psm_master_rule_' || _rcl_code || '
                    ON CONFLICT DO NOTHING;
                ';

                EXECUTE '
                    INSERT INTO global.rcl_product_mapping_product_store
                        (rcl_code, rule_code, psa_code, psa_name, validity)
                    SELECT rcl_code, rule_code, psa_code, psa_name, validity
                    FROM rcl_psm_master_rule_' || _rcl_code || ' x
                    JOIN global.rcl_product_mapping_product_store_rule y
                        USING(rcl_code, rcl_dimension)
                    ON CONFLICT (rcl_code, rule_code, psa_code)
                    DO UPDATE SET psa_name = excluded.psa_name,
                                  validity = excluded.validity,
                                  updated_at = NOW();
                ';

            END LOOP;

            CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

        EXCEPTION WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code, _sp_name, _log_step, SQLERRM,
                (clock_timestamp() - _st)::text, NULL
            );
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
        END;

    ELSE
        ----------------------------------------------------------------
        -- SKIPPED (OUTSIDE WINDOW)
        ----------------------------------------------------------------
        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'skipped',
            'Outside execution window (23:00–04:30 IST)',
            (clock_timestamp() - _st)::text,
            NULL
        );
    END IF;

END;
$procedure$;