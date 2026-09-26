--liquibase formatted sql
--changeset liquibase:mohammed.abdulla@impactanalytics.co_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding db column to derived_tables_mapping   
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_derived_tables_mapping_v2(
	input jsonb,
	p_user integer);

CREATE OR REPLACE FUNCTION data_platform.update_derived_tables_mapping_v2(
	input jsonb,
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
DECLARE
    v_affected_rows int4;
    v_deleted_rows int4;
    v_actioned_ts timestamp := now();
    has_graph_data boolean;
    v_task_name varchar;
BEGIN
    v_task_name := (input->>'name')::varchar;
    
    -- Log the task we're updating
    RAISE NOTICE 'Updating task: %', v_task_name;

    -- First verify if record exists
    IF NOT EXISTS (
        SELECT 1 
        FROM data_platform.derived_tables_mapping 
        WHERE name = v_task_name
        AND is_deleted = false
    ) THEN
        RAISE NOTICE 'No existing record found for task: %', v_task_name;
    ELSE
        -- Mark existing record as deleted
        UPDATE data_platform.derived_tables_mapping
        SET 
            is_deleted = true,
            updated_by = p_user,
            updated_at = v_actioned_ts
        WHERE name = v_task_name
        AND is_deleted = false;
        
        GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
        RAISE NOTICE 'Marked % rows as deleted in derived_tables_mapping', v_deleted_rows;
    END IF;
    
    -- Insert a new record with updated values
    INSERT INTO data_platform.derived_tables_mapping
    (
        name,
        run_in,
        replace_flag_gbq,
        replace_flag_psg,
        execution_order,
        type,
        label,
        schedule_interval,
        created_by,
        created_at,
        is_deleted
    )
    VALUES
    (
        v_task_name,
        COALESCE((input->>'run_in')::varchar, 'gbq'),
        COALESCE((input->>'replace_flag_gbq')::varchar, 'replace'),
        COALESCE((input->>'replace_flag_psg')::varchar, 'replace'),
        COALESCE((input->>'execution_order')::integer, 1),
        COALESCE((input->>'type')::varchar, 'query'),
        COALESCE((input->>'label')::varchar, ''),
        COALESCE((input->>'schedule_interval')::varchar, '0 0 * * *'),
        p_user,
        v_actioned_ts,
        false
    );
    
    RAISE NOTICE 'Inserted new record in derived_tables_mapping for task: %', v_task_name;
    
    -- Check if graph-related data exists in input
    has_graph_data := (input ? 'parent_id') OR (input ? 'tables_tobe_copied');
    
    -- Handle graph mapping data
    IF has_graph_data THEN
        RAISE NOTICE 'Processing graph data for task: %', v_task_name;
        
        -- Check if record exists in graph mapping
        IF NOT EXISTS (
            SELECT 1 
            FROM data_platform.derived_graph_mapping 
            WHERE task_id = v_task_name
            AND is_deleted = false
        ) THEN
            RAISE NOTICE 'No existing record found in derived_graph_mapping for task: %', v_task_name;
        ELSE
            -- Mark existing record as deleted
            UPDATE data_platform.derived_graph_mapping
            SET 
                is_deleted = true,
                updated_by = p_user,
                updated_at = v_actioned_ts
            WHERE task_id = v_task_name
            AND is_deleted = false;
            
            GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
            RAISE NOTICE 'Marked % rows as deleted in derived_graph_mapping', v_deleted_rows;
        END IF;
        
        -- Insert a new record with updated values
        INSERT INTO data_platform.derived_graph_mapping
        (
            task_id, 
            parent_id, 
            tables_tobe_copied,  
            created_by, 
            created_at, 
            is_deleted
        )
        VALUES
        (
            v_task_name,
            -- Handle parent_id empty/null cases
            CASE 
                WHEN (input->>'parent_id') IS NULL OR 
                     (input->>'parent_id') = '' OR 
                     (input->>'parent_id') = 'null' 
                THEN NULL
                ELSE (input->>'parent_id')::varchar
            END,
            -- Handle tables_tobe_copied empty/null cases
            CASE 
                WHEN (input->>'tables_tobe_copied') IS NULL OR 
                     (input->>'tables_tobe_copied') = '' OR 
                     (input->>'tables_tobe_copied') = 'null' 
                THEN NULL
                ELSE (input->'tables_tobe_copied')::varchar
            END,
            p_user,
            v_actioned_ts,
            false
        );
        
        RAISE NOTICE 'Inserted new record in derived_graph_mapping for task: %', v_task_name;
    END IF;

    -- Return success
    RETURN 1;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error details
        RAISE NOTICE 'Error in update_derived_tables_mapping_v2: %', SQLERRM;
        RAISE;
END;
$FUNCTION$;