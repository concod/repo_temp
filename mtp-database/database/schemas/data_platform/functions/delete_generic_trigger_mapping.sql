--liquibase formatted sql
--changeset liquibase:delete_generic_trigger_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_generic_trigger_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.delete_generic_trigger_mapping(
	p_view character varying,
	p_user integer);

CREATE OR REPLACE FUNCTION data_platform.delete_generic_trigger_mapping(
	p_view character varying,
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :5th July,2023    
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  _query  text;
  rows_count int4;
begin
	_query := 'SELECT count(*) from "data_platform".generic_trigger_mapping where is_deleted = False and "view" = ''' || p_view || ''' ;';
	execute _query into rows_count;
	if rows_count =0 then
		return -1;
	end if;
  update data_platform.generic_trigger_mapping set is_deleted=True, deleted_by=p_user, deleted_at=v_actioned_ts where "view"=p_view;
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$FUNCTION$;