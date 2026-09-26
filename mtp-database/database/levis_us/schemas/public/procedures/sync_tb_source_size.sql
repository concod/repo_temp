--liquibase formatted sql
--changeset aaqib.khan@impactanalytics.co :SPs set up in test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset

DROP PROCEDURE IF EXISTS public.sync_tb_source_size();

CREATE OR REPLACE PROCEDURE public.sync_tb_source_size()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _log_code VARCHAR := gen_random_uuid();
    _sp_name VARCHAR := 'public.sync_tb_source_size';
    _log_step VARCHAR;
    _st TIMESTAMP := clock_timestamp();
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, TRUE);
    PERFORM set_config('local.sp_name', _sp_name, TRUE);

    BEGIN
        -- Step 1: Insert or update records based on conflict keys
        INSERT INTO size_smart.tb_source_size (
            size_id,
            source_id,
            "order",
            planning_group_name,
            created_at,
            updated_at
        )
        SELECT DISTINCT
            ts.id AS size_id,
            tsc.id AS source_id,
            pb.order_number AS "order",
            pb.planning_group_name,
            tsc.created_at::timestamptz AT TIME ZONE 'Asia/Kolkata',
            tsc.updated_at::timestamptz AT TIME ZONE 'Asia/Kolkata'
        FROM size_smart.tb_size ts
        JOIN public.tb_source pb 
            ON ts."name" = pb.size_name
        JOIN size_smart.tb_source tsc 
            ON pb.profile_label = tsc."label"
        WHERE NOT (pb.size_name = '3634' AND pb.order_number = 13)
        ON CONFLICT (size_id, source_id, planning_group_name)
        DO UPDATE SET
            "order" = EXCLUDED."order",
            updated_at = EXCLUDED.updated_at;

        -- Step 2: Delete extra sizes not present in expected_sizes
        WITH expected_sizes AS (
            SELECT 
                pub.planning_group_name,
                pub.profile_label,
                sm.id AS source_id,
                ARRAY_AGG(pub.size_name ORDER BY pub.size_name) AS updated_size_names
            FROM public.tb_source pub
            JOIN size_smart.tb_source sm
                ON pub.profile_label = sm.label
            GROUP BY 1,2,3
        ),
        actual_sizes AS (
            SELECT 
                tss.planning_group_name,
                tss.source_id,
                ts.name AS size_name,
                tss.id AS source_size_id
            FROM size_smart.tb_source_size tss
            JOIN size_smart.tb_size ts
                ON tss.size_id = ts.id
        )
        DELETE FROM size_smart.tb_source_size tss
        USING actual_sizes a
        JOIN expected_sizes e
            ON a.source_id = e.source_id
           AND a.planning_group_name = e.planning_group_name
        WHERE tss.id = a.source_size_id
          AND a.size_name <> ALL(e.updated_size_names);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END;
$procedure$
;
