--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:add_data_ingestion_config_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added add_data_ingestion_config_instance function

DROP FUNCTION IF EXISTS data_platform.add_generic_trigger_mapping_instance(jsonb, int4, varchar);


CREATE OR REPLACE FUNCTION data_platform.add_generic_trigger_mapping_instance(
  input jsonb, 
  p_user integer, 
  p_instance character varying
  )
 RETURNS integer
 LANGUAGE plpgsql
AS $function$

/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample Call :
select * from data_platform.add_generic_trigger_mapping_instance(
            '{"view":"view_name","source_config":"source_config_name","connector":"connector_name","trigger_rule":"trigger_rule_name","trigger_query":"trigger_query_name","trigger_query_filter":"trigger_query_filter_name","trigger_file":"trigger_file_name","is_mandatory":"true"}',
            3,
            '1');
      
*/

declare 
  v_actioned_ts timestamp := now();
  v_affected_rows int4;
  rows_count int4 := 0;
  _query text;
begin
	_query := 'SELECT count(*) from "data_platform".generic_trigger_mapping where is_deleted = False and "view" = ''' || (input->>'view')::varchar || '''  and "instance" = ''' || p_instance::smallint || ''';'; 
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
	"instance",
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
	p_instance::smallint,
    p_user ,
    v_actioned_ts,
	  'False');
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  return v_affected_rows;
end;
$function$
;
