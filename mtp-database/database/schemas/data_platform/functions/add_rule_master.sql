--liquibase formatted sql
--changeset liquibase:add_rule_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_rule_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_rule_master(
	input jsonb,
	p_user integer);


CREATE OR REPLACE FUNCTION data_platform.add_rule_master(
	input jsonb,
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :11th July,2023    
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  rows_count int4 := 0;
  _query text;
begin
	_query := 'SELECT count(*) from "data_platform".rule_master where is_deleted = False and "rule" = ''' || (input->>'rule')::varchar || ''';';
	execute _query into rows_count;
	if rows_count >=1 then
		return -1;
	end if;
    insert into data_platform.rule_master 
      (
		  agg,					
    "value",					
    kpis,
    kpis_info,		
    "table",				
    outer_filter,				
    "action",				
    "name",				
    group_by,					
    inner_filter,					
    "module",					
    threshold,				
    "rule",
	rule_display_name,
	rule_description,
	created_by ,
    created_at,
	  is_deleted
		  
	  )
    values
      ((input->>'agg')::boolean , 
				  (input->>'value')::varchar , 
    (input->>'kpis')::varchar , 
    (input->>'kpis_info')::varchar , 
    (input->>'table')::varchar, 
    (input->>'outer_filter')::varchar , 
    (input->>'action')::varchar , 
    (input->>'name')::varchar,
	(input->>'group_by')::varchar,
	(input->>'inner_filter')::varchar,
	(input->>'module')::varchar,
	(input->>'threshold')::varchar,
	(input->>'rule')::varchar,
	(input->>'rule_display_name')::varchar,
	(input->>'rule_description')::varchar,
    p_user ,
    v_actioned_ts,
	  'False');
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$FUNCTION$;