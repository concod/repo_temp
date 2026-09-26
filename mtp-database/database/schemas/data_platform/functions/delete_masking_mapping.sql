--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:delete_masking_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for deleting masking_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.delete_masking_mapping(
    p_masking_mapping_id integer,
    p_user integer);
CREATE OR REPLACE FUNCTION data_platform.delete_masking_mapping(
    p_masking_mapping_id integer,
    p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
declare 
    v_actioned_ts timestamp := now();
    v_affected_rows int4;
    _query text;
    rows_count int4;
begin
    _query := 'SELECT count(*) from "data_platform".masking_mapping where is_deleted = False and masking_mapping_id = ' || p_masking_mapping_id || ' ;';
    execute _query into rows_count;
    if rows_count = 0 then
        return -1;
    end if;

    update data_platform.masking_mapping 
    set is_deleted = True, 
        deleted_by = $2, 
        deleted_at = v_actioned_ts 
    where masking_mapping_id = $1;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    return v_affected_rows;
end;
$FUNCTION$;
