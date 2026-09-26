--liquibase formatted sql
--changeset mohammed.abdulla@impactanalytics.co:delete_all_derived_tables_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: intial changeset for v1
DROP FUNCTION IF EXISTS data_platform.delete_all_derived_tables_mapping(varchar[], int4);

CREATE OR REPLACE FUNCTION data_platform.delete_all_derived_tables_mapping(p_names varchar[], p_user integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  v_actioned_ts timestamp := now();
  v_total_affected_rows int4 := 0;
  v_affected_rows int4;
  _name text;
begin
  -- Update all matching names in derived_tables_mapping
  UPDATE data_platform.derived_tables_mapping
  SET
      is_deleted = true,
      deleted_by = p_user,
      deleted_at = v_actioned_ts
  WHERE
      "name" = ANY(p_names) 
      AND is_deleted = false
  RETURNING 1 INTO v_affected_rows;
  
  v_total_affected_rows := COALESCE(v_affected_rows, 0);

  -- Return the total number of rows that were deleted
  return v_total_affected_rows;
end;
$function$
;