--liquibase formatted sql
--changeset liquibase:delete_model_registry runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_model_registry
--rollback: SELECT 1
DROP FUNCTION IF EXISTS ada.delete_model_registry(p_tag jsonb, p_code character varying, p_user integer);
CREATE OR REPLACE FUNCTION ada.delete_model_registry(p_tag jsonb, p_code character varying, p_user integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
begin
	
  update ada.model_registry
  set is_deleted = true, updated_by = p_user, updated_at = v_actioned_ts
  where tag_id = (select tag_id from ada.model_registry_tags where tag = p_tag)
  and code  = p_code
  and is_latest;
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$function$
;
