--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:update_data_ingestion_config_batch_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added update_data_ingestion_config_batch_instance function

DROP FUNCTION IF EXISTS data_platform.update_data_ingestion_config_batch_instance(_varchar, varchar, _jsonb, int4, varchar);

CREATE OR REPLACE FUNCTION data_platform.update_data_ingestion_config_batch_instance(
	p_attribute_name_list character varying[], 
	p_module_name character varying, 
	p_params_list jsonb[], 
	p_user integer, 
	p_instance character varying
)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample call :
select * from data_platform.update_data_ingestion_config_batch_instance(
            ARRAY['data_ingestion_pipeline_execution_date'],ARRAY['{"attribute_name": "data_ingestion_pipeline_execution_date", "datatype": "timestamp", "attribute_value": "2021-01-01T15:00:00+00:00", "module": null, "is_mandatory": null, "description": null, "display_name": null}']::jsonb[],3)
*/
declare 
  _attribute_name character varying;
  _params jsonb;
  _query character varying;
  _affected_rows integer;
  _result integer;
begin
  _result =0;
  FOR i IN 1..array_length(p_attribute_name_list, 1) LOOP
  	_attribute_name = p_attribute_name_list[i];
	_params = p_params_list[i]::jsonb;
	_query := 'select * from data_platform.update_data_ingestion_config_instance('''||_attribute_name||''','''||p_module_name||''','''||_params||''','||p_user||','''||p_instance||''');';
	raise notice 'query %s',_query;
	execute _query into _affected_rows ;	
  	_result = _result+_affected_rows;
  END LOOP;
  return _result;
end;
$function$
;

