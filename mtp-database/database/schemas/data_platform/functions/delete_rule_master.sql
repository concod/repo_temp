--liquibase formatted sql
--changeset liquibase:delete_rule_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_rule_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.delete_rule_master(
	p_rule character varying,
	p_user integer);


CREATE OR REPLACE FUNCTION data_platform.delete_rule_master(
	p_rule character varying,
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :12th July,2023    
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  _query  text;
  rows_count int4;
begin
	_query := 'SELECT count(*) from "data_platform".rule_master where is_deleted = False and "rule" = ''' || p_rule || ''' ;';
	execute _query into rows_count;
	if rows_count =0 then
		return -1;
	end if;
  update data_platform.rule_master set is_deleted=True, deleted_by=p_user, deleted_at=v_actioned_ts where "rule"=p_rule;
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$FUNCTION$;