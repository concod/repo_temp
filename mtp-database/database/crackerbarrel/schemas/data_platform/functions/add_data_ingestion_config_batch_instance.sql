--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:add_data_ingestion_config_batch_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added add_data_ingestion_config_batch_instance function

DROP FUNCTION IF EXISTS data_platform.add_data_ingestion_config_batch_instance(_varchar, _varchar, _varchar, _varchar, _bool, _varchar, _varchar, int4, _bool, _varchar);


CREATE OR REPLACE FUNCTION data_platform.add_data_ingestion_config_batch_instance(
	p_attribute_name_list character varying[], 
	p_attribute_value_list character varying[], 
	p_datatype_list character varying[], 
	p_module_list character varying[], 
	p_is_mandatory_list boolean[], 
	p_description_list character varying[], 
	p_display_name_list character varying[], 
	p_user integer, p_hidden boolean[], 
	p_instance character varying[]
	)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample Call :
select * from data_platform.add_data_ingestion_config_batch_instance(ARRAY['tenant-id','region'],
                          ARRAY ['CK','US'],ARRAY ['str','str'],ARRAY['configuration','mapping'],
                          ARRAY[True,True],ARRAY['name of tenant','name of region'],
						  ARRAY['tenant','region'],3,ARRAY[True,False],ARRAY[1,2]);
      
*/

declare 
  attribute_name character varying;
  attribute_value text;
  datatype character varying;
  module character varying;
  is_mandatory boolean;
  hidden boolean;
  instance character varying;
  description character varying;
  display_name character varying;
  _query character varying;
  _affected_rows integer;
  _result integer;
begin
  _result =0;
  FOR i IN 1..array_length(p_attribute_name_list, 1) LOOP
  	attribute_name = p_attribute_name_list[i];
	attribute_value = p_attribute_value_list[i];
	datatype =  p_datatype_list[i];
	module = p_module_list[i];
	is_mandatory = p_is_mandatory_list[i];
	description = p_description_list[i];
	display_name = p_display_name_list[i];
	hidden =  p_hidden[i];
	instance = p_instance[i];
	_query := 'select * from data_platform.add_data_ingestion_config_instance('''||attribute_name||''','''||attribute_value||''','''||datatype||''','''||module||''','||is_mandatory||','''||description||''','''||display_name||''','||p_user||','||hidden||','''||cast(instance as smallint)||''');';
	raise notice 'query %s',_query;
	execute _query into _affected_rows ;	
  	_result = _result+_affected_rows;
  END LOOP;
  return _result;
end;
$function$
;