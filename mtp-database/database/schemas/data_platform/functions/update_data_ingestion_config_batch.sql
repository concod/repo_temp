--liquibase formatted sql
--changeset liquibase:update_data_ingestion_config_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_data_ingestion_config_batch
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_data_ingestion_config_batch(
	p_attribute_name_list character varying[],
	p_module_name character varying,
	p_params_list jsonb[],
	p_user integer);

CREATE OR REPLACE FUNCTION data_platform.update_data_ingestion_config_batch(
	p_attribute_name_list character varying[],
	p_module_name character varying,
	p_params_list jsonb[],
	p_user integer)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :14th April,2023    
Sample call :
select * from data_platform.update_data_ingestion_config_batch(
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
	_query := 'select * from data_platform.update_data_ingestion_config('''||_attribute_name||''','''||p_module_name||''','''||_params||''','||p_user||');';
	raise notice 'query %s',_query;
	execute _query into _affected_rows ;	
  	_result = _result+_affected_rows;
  END LOOP;
  return _result;
end;
$FUNCTION$;