--liquibase formatted sql
--changeset liquibase:mohammed.abdulla@impactanalytics.co_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding db column to derived_tables_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_derived_tables_mapping_v2();

CREATE OR REPLACE FUNCTION data_platform.get_derived_tables_mapping_v2()
    RETURNS TABLE(
        name varchar,
        run_in varchar,
        replace_flag_gbq varchar,
        replace_flag_psg varchar,
        execution_order integer,
        type varchar,
        label varchar,
        db varchar,
        schedule_interval varchar,
        parent_id varchar,
        tables_tobe_copied varchar,
        created_at timestamp,
        created_by integer
    )
    LANGUAGE 'plpgsql'
AS $FUNCTION$
BEGIN
    RETURN QUERY
    SELECT 
        dtm.name,
        dtm.run_in,
        dtm.replace_flag_gbq,
        dtm.replace_flag_psg,
        dtm.execution_order,
        dtm.type,
        dtm.label,
        dtm.db,
        dtm.schedule_interval,
        dgm.parent_id,
        dgm.tables_tobe_copied,
        dtm.created_at::timestamp,
        dtm.created_by
    FROM 
        data_platform.derived_tables_mapping dtm
    LEFT JOIN 
        data_platform.derived_graph_mapping dgm 
    ON 
        dtm.name = dgm.task_id 
        AND dgm.is_deleted = false
    WHERE 
        dtm.is_deleted = false;
END;
$FUNCTION$;