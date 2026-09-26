--liquibase formatted sql
--changeset liquibase:add_generic_trigger_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_generic_trigger_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_generic_trigger_mapping(
	input jsonb,
	p_user integer);


CREATE OR REPLACE FUNCTION data_platform.add_generic_trigger_mapping(
	input jsonb,
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :4th July,2023    
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  rows_count int4 := 0;
  _query text;
begin
	_query := 'SELECT count(*) from "data_platform".generic_trigger_mapping where is_deleted = False and "view" = ''' || (input->>'view')::varchar || ''';';
	execute _query into rows_count;
	if rows_count >=1 then
		return -1;
	end if;
    insert into data_platform.generic_trigger_mapping 
      ("view",				
    source_config,				
    connector,				
    trigger_rule,					
    trigger_query,					
    "trigger_query_filter",					
    trigger_file,
	is_mandatory,
	created_by ,
    created_at,
	  is_deleted)
    values
      ((input->>'view')::varchar , 
				  (input->>'source_config')::varchar , 
    (input->>'connector')::varchar , 
    (input->>'trigger_rule')::varchar, 
    (input->>'trigger_query')::varchar , 
    (input->>'trigger_query_filter')::varchar , 
    (input->>'trigger_file')::varchar,
	(input->>'is_mandatory')::bool,
    p_user ,
    v_actioned_ts,
	  'False');
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$FUNCTION$;