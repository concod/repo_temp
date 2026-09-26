--liquibase formatted sql
--changeset liquibase:update_rule_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_rule_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_rule_master(
	input jsonb,
	p_user integer);

CREATE OR REPLACE FUNCTION data_platform.update_rule_master(
	input jsonb,
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :12th May,2023    
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  _query  text;
  _update_query text;
  rows_count int4;
  _key varchar;
  _value TEXT;
  _ret_val jsonb := '{}';
begin
	_query := 'SELECT count(*) from "data_platform".rule_master where is_deleted = False and "rule" = ''' ||  (input->>'rule')::varchar || ''' ;';
	execute _query into rows_count;
	if rows_count =0 then
		return -1;
	end if;
	
	_update_query := 'UPDATE "data_platform".rule_master SET ';
	for _key, _value in select * from jsonb_each_text($1) where value is not null loop
		_update_query := _update_query || format('%I = %L, ', _key, _value);
    END LOOP;
	
	_update_query := _update_query || format(' updated_by = %L, updated_at = %L', p_user, v_actioned_ts);
	_update_query := _update_query || ' WHERE '||format(' "rule" = %L  and is_deleted = %L', (input->>'rule')::varchar,False);
    EXECUTE _update_query;
		
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$FUNCTION$;