--liquibase formatted sql
--changeset liquibase:mohammed.abdulla@impactanalytics.co_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updating db_type column in derived_tables_mapping and derived_graph_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_derived_tables_mapping_v2(
	input jsonb,
	p_user integer);

CREATE OR REPLACE FUNCTION data_platform.add_derived_tables_mapping_v2(input jsonb, p_user integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  rows_count int4 := 0;
  _query text;
  has_graph_data boolean;
  v_task_id varchar;
BEGIN
    -- Check if record already exists (active version)
    SELECT count(*) INTO rows_count 
    FROM "data_platform".derived_tables_mapping 
    WHERE is_deleted = False AND "name" = (input->>'name')::varchar;
    
    IF rows_count >= 1 THEN
        RETURN -1; -- Active record already exists
    END IF;
    
    -- Insert into derived_tables_mapping
    INSERT INTO data_platform.derived_tables_mapping 
    (
        "name",				
        run_in,				
        replace_flag_gbq,				
        replace_flag_psg,					
        execution_order,					
        "type",
		"label",
        "db",
        "db_type",					
        schedule_interval,
        created_by,
        created_at,
        is_deleted
    )
    VALUES
    (
        (input->>'name')::varchar, 
        (input->>'run_in')::varchar, 
        (input->>'replace_flag_gbq')::varchar, 
        (input->>'replace_flag_psg')::varchar, 
        (input->>'execution_order')::integer, 
        (input->>'type')::varchar, 
		(input->>'label')::varchar, 
        (input->>'db')::varchar,
        (input->>'db_type')::varchar,
        (input->>'schedule_interval')::varchar,
        p_user,
        v_actioned_ts,
        false
    );
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    -- Handle graph mapping with versioning pattern
    has_graph_data := (input ? 'parent_id') OR 
                     (input ? 'tables_tobe_copied');
    
    IF has_graph_data THEN
        v_task_id := (input->>'name')::varchar;
        
        -- First mark existing active graph record as deleted (if exists)
        UPDATE data_platform.derived_graph_mapping
        SET is_deleted = true,
            updated_by = p_user,
            updated_at = v_actioned_ts,
            deleted_by = p_user,
            deleted_at = v_actioned_ts
        WHERE task_id = v_task_id AND is_deleted = false;
        
        -- Then insert new graph record
        INSERT INTO data_platform.derived_graph_mapping 
        (
            task_id,
            parent_id,
            tables_tobe_copied,
            db,
            db_type,
            created_by,
            created_at,
            is_deleted
        )
        VALUES
        (
            v_task_id,
            (input->>'parent_id')::varchar,
            (input->>'tables_tobe_copied')::varchar,
            (input->>'db')::varchar,
            (input->>'db_type')::varchar,
            p_user,
            v_actioned_ts,
            false
        );
        
        v_affected_rows := v_affected_rows + 1;
    END IF;
    
    RETURN v_affected_rows;
END;
$function$
;

