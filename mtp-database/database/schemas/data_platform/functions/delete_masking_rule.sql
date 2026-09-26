--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:delete_masking_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for deleting masking_rule
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.delete_masking_rule(
    p_masking_id integer,
    p_user integer);
CREATE OR REPLACE FUNCTION data_platform.delete_masking_rule(
    p_masking_id integer,
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
    _query := 'SELECT count(*) from "data_platform".masking_rules where is_deleted = False and masking_id = ' || p_masking_id || ' ;';
    execute _query into rows_count;
    if rows_count = 0 then
        return -1;
    end if;

    update data_platform.masking_rules 
    set is_deleted = True, 
        deleted_by = p_user, 
        deleted_at = v_actioned_ts 
    where masking_id = $1;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    return v_affected_rows;
end;
$FUNCTION$;
