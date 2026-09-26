--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:save_generic_master_mapping_alter runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:added db_type
--comment: added db type
DROP FUNCTION IF EXISTS data_platform.save_generic_master_mapping(
	input jsonb);

CREATE OR REPLACE FUNCTION data_platform.save_generic_master_mapping(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 declare 
    _source_table text;
	_source_level text;
	_generic_mapping_table text ;
	_destination_table text ;
	_destination_level text ;
	_to_be_ingested bool ;
	_is_required_in_master bool ;
	_persist_attributes_table bool ;
	_persist_hierarchies_table bool ;
	_cross_validations text ;
	_filter_column text ;
	_pull_type text ;
	_persist_to_db bool; 
    _data_loss_threshold int;
    _db_type text;
    _product_name text;
    _input_json json; 
    _key text;
    _value text;
	 _insert_query text;
	_insert_query1 text;
	 _delete_query text;
		x text;
 		y text;
 begin
	_delete_query:='delete from "global".generic_master_mapping where True';
	raise notice '%', _delete_query;
	execute _delete_query;
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='source_table' then 
 		_source_table=_value;
 		elsif _key ='source_level' then 
 		if _value is null then _source_level='null'; else _source_level=E'\''||_value||E'\''; end if;
		elsif _key ='generic_mapping_table' then 
 		_generic_mapping_table = _value;
		elsif _key='destination_table' then
        _destination_table=_value;
       elsif _key='destination_level' then
       	if _value is null then _destination_level='null'; else _destination_level=E'\''||_value||E'\''; end if;
        elsif _key='to_be_ingested' then
        _to_be_ingested=_value;
        elsif _key='is_required_in_master' then
        _is_required_in_master=_value;
        elsif _key='persist_attributes_table' then
        _persist_attributes_table=_value;
        elsif _key='persist_hierarchies_table' then
        _persist_hierarchies_table=_value;
        elsif _key='cross_validations' then
        if _value is null then _cross_validations='null'; else _cross_validations=E'\''||replace(_value,E'\'','"')||E'\''; end if;
        elsif _key='filter_column' then
        if _value is null then _filter_column='null'; else _filter_column=E'\''||replace(_value,E'\'','"')||E'\''; end if;
        elsif _key='pull_type' then
        _pull_type=_value;
        elsif _key='persist_to_db' then
        _persist_to_db=_value;
        elsif _key='data_loss_threshold' then
        _data_loss_threshold=_value;
		elsif _key='db_type' then
        _db_type=_value;
		elsif _key='product_name' then
        _product_name=_value;
		
 		end if;
 		end loop;		
		_insert_query:='INSERT INTO "global".generic_master_mapping (source_table, source_level, generic_mapping_table, destination_table, destination_level, to_be_ingested, is_required_in_master, persist_attributes_table, persist_hierarchies_table, cross_validations, filter_column, pull_type, persist_to_db, data_loss_threshold,db_type,product_name)
                            VALUES('''||_source_table||''', '||_source_level||', '''||_generic_mapping_table||''', '''||_destination_table||''', '||_destination_level||', '||_to_be_ingested||', '||_is_required_in_master||', '||_persist_attributes_table||', '||_persist_hierarchies_table||', '||_cross_validations||', '||_filter_column||', '''||_pull_type||''', '||_persist_to_db||', '||_data_loss_threshold||','''||_db_type||''','''||_product_name||''');';
        raise notice '%', _insert_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$function$
;