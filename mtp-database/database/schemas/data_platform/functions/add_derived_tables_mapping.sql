--liquibase formatted sql
--changeset liquibase:mohammed.abdulla@impactanalytics.co 1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add db column to the derived_tables_mapping table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_derived_tables_mapping(
	input jsonb,
	p_user integer);

CREATE OR REPLACE FUNCTION data_platform.add_derived_tables_mapping(input jsonb, p_user integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
/*
Created by : Himani Sharma   Created On :16th May,2023    
*/
declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  rows_count int4 := 0;
  _query text;
begin
	_query := 'SELECT count(*) from "data_platform".derived_tables_mapping where is_deleted = False and "name" = ''' || (input->>'name')::varchar || ''';';
	execute _query into rows_count;
	if rows_count >=1 then
		return -1;
	end if;
    insert into data_platform.derived_tables_mapping 
      ("name",				
    run_in,				
    replace_flag_gbq,				
    replace_flag_psg,					
    execution_order,					
    "type",
    "label",
    "db",					
    schedule_interval,
	created_by ,
    created_at,
	  is_deleted)
    values
      ((input->>'name')::varchar , 
				  (input->>'run_in')::varchar , 
    (input->>'replace_flag_gbq')::varchar , 
    (input->>'replace_flag_psg')::varchar, 
    (input->>'execution_order')::integer , 
    (input->>'type')::varchar , 
    (input->>'label')::varchar,
    (input->>'db')::varchar,
    (input->>'schedule_interval')::varchar,
    p_user ,
    v_actioned_ts,
	  'False');
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$function$
;