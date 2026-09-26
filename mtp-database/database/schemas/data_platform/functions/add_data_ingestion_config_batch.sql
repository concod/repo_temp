--liquibase formatted sql
--changeset akash.zalavadiya@impactanalytics.co:add_data_ingestion_config_batch runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added hidden variable in add_data_ingestion_config_batch function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_data_ingestion_config_batch(
	p_attribute_name_list character varying[],
	p_attribute_value_list character varying[],
	p_datatype_list character varying[],
	p_module_list character varying[],
	p_is_mandatory_list boolean[],
	p_description_list character varying[],
	p_display_name_list character varying[],
	p_user integer,
	p_hidden boolean);

CREATE OR REPLACE FUNCTION data_platform.add_data_ingestion_config_batch(
	p_attribute_name_list character varying[],
	p_attribute_value_list character varying[],
	p_datatype_list character varying[],
	p_module_list character varying[],
	p_is_mandatory_list boolean[],
	p_description_list character varying[],
	p_display_name_list character varying[],
	p_user integer,
	p_hidden boolean)
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :16th March,2023    
Sample Call :
select * from data_platform.add_data_ingestion_config_batch(ARRAY['tenant-id','region'],
                          ARRAY ['CK','US'],ARRAY ['str','str'],ARRAY['configuration','mapping'],
                          ARRAY[True,True],ARRAY['name of tenant','name of region'],ARRAY['tenant','region'],3);
      
*/
declare 
  attribute_name character varying;
  attribute_value text;
  datatype character varying;
  module character varying;
  is_mandatory boolean;
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
	_query := 'select * from data_platform.add_data_ingestion_config('''||attribute_name||''','''||attribute_value||''','''||datatype||''','''||module||''','||is_mandatory||','''||description||''','''||display_name||''','||p_user||','||p_hidden||');';
	raise notice 'query %s',_query;
	execute _query into _affected_rows ;	
  	_result = _result+_affected_rows;
  END LOOP;
  return _result;
end;
$FUNCTION$;


--changeset himani.sharma@impactanalytics.co:add_data_ingestion_config_batch_alter_2 stripComments:false splitStatements:false context:Release_1_3 labels:hidden_cols_var
--comment: reading hidden col in loop
DROP FUNCTION IF EXISTS data_platform.add_data_ingestion_config_batch(
	p_attribute_name_list character varying[],
	p_attribute_value_list character varying[],
	p_datatype_list character varying[],
	p_module_list character varying[],
	p_is_mandatory_list boolean[],
	p_description_list character varying[],
	p_display_name_list character varying[],
	p_user integer,
	p_hidden boolean);
	
DROP FUNCTION IF EXISTS data_platform.add_data_ingestion_config_batch(
	p_attribute_name_list character varying[],
	p_attribute_value_list character varying[],
	p_datatype_list character varying[],
	p_module_list character varying[],
	p_is_mandatory_list boolean[],
	p_description_list character varying[],
	p_display_name_list character varying[],
	p_user integer,
	p_hidden boolean[]);

CREATE OR REPLACE FUNCTION data_platform.add_data_ingestion_config_batch(
	p_attribute_name_list character varying[],
	p_attribute_value_list character varying[],
	p_datatype_list character varying[],
	p_module_list character varying[],
	p_is_mandatory_list boolean[],
	p_description_list character varying[],
	p_display_name_list character varying[],
	p_user integer,
	p_hidden boolean[])
    RETURNS integer
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :30th April,2023    
Sample Call :
select * from data_platform.add_data_ingestion_config_batch(ARRAY['tenant-id','region'],
                          ARRAY ['CK','US'],ARRAY ['str','str'],ARRAY['configuration','mapping'],
                          ARRAY[True,True],ARRAY['name of tenant','name of region'],ARRAY['tenant','region'],3,ARRAY[True,False]);
      
*/
declare 
  attribute_name character varying;
  attribute_value text;
  datatype character varying;
  module character varying;
  is_mandatory boolean;
  hidden boolean;
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
	_query := 'select * from data_platform.add_data_ingestion_config('''||attribute_name||''','''||attribute_value||''','''||datatype||''','''||module||''','||is_mandatory||','''||description||''','''||display_name||''','||p_user||','||hidden||');';
	raise notice 'query %s',_query;
	execute _query into _affected_rows ;	
  	_result = _result+_affected_rows;
  END LOOP;
  return _result;
end;
$FUNCTION$;


