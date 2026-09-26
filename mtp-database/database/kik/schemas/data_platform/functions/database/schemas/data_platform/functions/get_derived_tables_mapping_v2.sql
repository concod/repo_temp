--liquibase formatted sql
--changeset mohammed.abdulla@impactanalytics.co:get_derived_tables_mapping_v2_alter runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:added db_type
--comment: updating db_type column in derived_tables_mapping and derived_graph_mapping
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
        db_type varchar,
        schedule_interval varchar,
        parent_id varchar,
        tables_tobe_copied varchar,
        created_at timestamp,
        created_by integer
    )
    LANGUAGE plpgsql
AS $function$
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
        dtm.db_type,
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
        AND dtm.db_type = dgm.db_type
        AND dtm.db = dgm.db
        AND dgm.is_deleted = false
    WHERE 
        dtm.is_deleted = false;
END;
$function$
;