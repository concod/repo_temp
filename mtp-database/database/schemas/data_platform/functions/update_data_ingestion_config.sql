--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:review runOnChange:true stripComments:false splitStatements:false context:RELEASE_1_1 labels:update_data_ingestion_config
--comment: added function update_data_ingestion_config
--rollback: SELECT 1

DROP FUNCTION IF EXISTS data_platform.update_data_ingestion_config(
	p_attribute_name character varying,
	p_module character varying,
	params jsonb,
	p_user integer);

CREATE OR REPLACE FUNCTION data_platform.update_data_ingestion_config(
	p_attribute_name character varying,
	p_module character varying,
	params jsonb,
	p_user integer)
    RETURNS text
    LANGUAGE 'plpgsql'
AS $FUNCTION$
/*
Created by : Himani Sharma   Created On :15th March,2023    
Sample call :
select * from global.update_data_ingestion_config(
            'tenant-id','{"description": "test to update","attribute_value":"Signet","datatype":"str"}',3)
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
		_query := 'SELECT row_to_json(t) from (SELECT * from "data_platform".data_ingestion_config where is_latest= true and is_deleted = false and module = ''' || p_module || ''' and attribute_name = ''' || p_attribute_name || ''') t;';
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
		
		select * into _new_val from data_platform.add_data_ingestion_config(p_attribute_name,_ret_val->>'attribute_value',_ret_val->>'datatype',_ret_val->>'module',(_ret_val->>'is_mandatory')::bool,_ret_val->>'description',_ret_val->>'display_name' ,p_user,(_ret_val->>'hidden')::bool);
		return _new_val;
	end;
$FUNCTION$;