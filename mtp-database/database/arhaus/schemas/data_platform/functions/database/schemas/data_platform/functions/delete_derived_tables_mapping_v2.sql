--liquibase formatted sql
--changeset mohammed.abdulla@impactanalytics.co:delete_derived_tables_mapping_v2_alter runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:added db_type
--comment: adding db_type and db columns to delete_derived_tables_mapping_v2
DROP FUNCTION IF EXISTS data_platform.delete_derived_tables_mapping_v2(
    p_name character varying,
    p_db_type character varying,
    p_db character varying,
    p_user integer);


CREATE OR REPLACE FUNCTION data_platform.delete_derived_tables_mapping_v2(p_name character varying,p_db_type character varying, p_db character varying, p_user integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$

DECLARE
    v_affected_rows int4 := 0;
    v_graph_rows int4 := 0;
    v_actioned_ts timestamp := now();
BEGIN
    -- Update main mapping table
    UPDATE data_platform.derived_tables_mapping
    SET 
        is_deleted = true,
        updated_by = p_user,
        updated_at = v_actioned_ts,
        deleted_by = p_user,
        deleted_at = v_actioned_ts
    WHERE name = p_name AND db_type = p_db_type AND db = p_db AND is_deleted = false;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    -- Update graph mapping table if record exists
    UPDATE data_platform.derived_graph_mapping
    SET 
        is_deleted = true,
        updated_by = p_user,
        updated_at = v_actioned_ts,
        deleted_by = p_user,
        deleted_at = v_actioned_ts
    WHERE name = p_name AND db_type = p_db_type AND db = p_db AND is_deleted = false;
    
    GET DIAGNOSTICS v_graph_rows = ROW_COUNT;
    
    -- Return total affected rows
    RETURN v_affected_rows + v_graph_rows;
END;
$function$
;