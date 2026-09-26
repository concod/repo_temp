--liquibase formatted sql
--changeset liquibase:add_kpi_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_kpi_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_kpi_master(
	input jsonb,
	p_user integer);


CREATE OR REPLACE FUNCTION data_platform.add_kpi_master(
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
	_query := 'SELECT count(*) from "data_platform".kpi_master where is_deleted = False and "kpicode" = ''' || (input->>'kpicode')::varchar || ''';';
	execute _query into rows_count;
	if rows_count >=1 then
		return -1;
	end if;
    insert into data_platform.kpi_master 
      (
		  kpicode ,				
    kpi ,				
    "query" ,				
    variable ,				
    "table" ,
	created_by ,
    created_at,
	  is_deleted
	  )
    values
      (
	(input->>'kpicode')::varchar , 
    (input->>'kpi')::varchar , 
    (input->>'query')::varchar, 
    (input->>'variable')::varchar , 
    (input->>'table')::varchar , 
    p_user ,
    v_actioned_ts,
	  'False');
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$FUNCTION$;