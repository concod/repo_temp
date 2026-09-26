--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:update_data_ingestion_config_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added update_data_ingestion_config_instance function

DROP FUNCTION IF EXISTS data_platform.update_data_ingestion_config_instance(varchar, varchar, jsonb, int4, varchar);

CREATE OR REPLACE FUNCTION data_platform.update_data_ingestion_config_instance(
	p_attribute_name character varying, 
	p_module character varying, 
	params jsonb, 
	p_user integer, 
	p_instance character varying)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
Sample call :
select * from data_platform.update_data_ingestion_config_instance(
            'data_ingestion_pipeline_execution_date','data_ingestion_pipeline_execution_date',
            '{"datatype": "timestamp", "attribute_value": "2021-01-01T15:00:00+00:00", "module": null, "is_mandatory": null, "description": null, "display_name": null}',
            3,
            '1')
*/
	declare
	_key text;
	_value text;
	_filters text[];
	_filter_text text;
	_query text;
	_attribute_value text;
	_ret_val jsonb;
	_new_val text;
	begin
		
		raise notice 'input params %s', params;
		_query := 'SELECT row_to_json(t) from (SELECT * from "data_platform".data_ingestion_config where is_latest= true and is_deleted = false and module = ''' || p_module || ''' and attribute_name = ''' || p_attribute_name || ''' and instance = ''' || cast(p_instance as smallint) || ''') t;';
		execute _query into _ret_val;
		raise notice 'result for where query %s', _ret_val;
		
		if  jsonb_typeof(_ret_val) IS NULL then
			return 0;
		end if;
		
		for _key, _value in select * from jsonb_each_text($3) where value is not null loop
			_ret_val := _ret_val::jsonb || jsonb_build_object(_key, _value);
		end loop;
		_ret_val := _ret_val::jsonb - 'created_by' - 'updated_by' - 'version' - 'created_at' - 'is_deleted' -'updated_at' -'is_latest';
		
		raise notice 'input for insert query %s', _ret_val;
		
		select * into _new_val from data_platform.add_data_ingestion_config_instance(p_attribute_name,_ret_val->>'attribute_value',_ret_val->>'datatype',_ret_val->>'module',(_ret_val->>'is_mandatory')::bool,_ret_val->>'description',_ret_val->>'display_name' ,p_user,(_ret_val->>'hidden')::bool, p_instance);
		return _new_val;
	end;
$function$
;
