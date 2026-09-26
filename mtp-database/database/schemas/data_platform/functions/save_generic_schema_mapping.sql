--liquibase formatted sql
--changeset liquibase:manoj.solanki@impactanalytics.co runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:save_generic_schema_mapping
--comment: bug fix for formula col to handle both double and single qoutes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.save_generic_schema_mapping(
	input jsonb,text);
CREATE OR REPLACE FUNCTION data_platform.save_generic_schema_mapping(
	input jsonb,text)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
    _source_column_name text;
	_source_column_datatype text;
	_required_in_product text;
	_generic_column_name text;
	_is_pk text;
	_generic_column_datatype text;
	_formula text;
	_is_attribute text;
	_is_hierarchy text;
	_hierarchy_level text;
	_is_null_allowed text;
	_unique_by text;
	_display_name text;
	_is_partition_col text;
	_is_clustering_col text;
    _input_json json; 
    _key text;
    _value text;
 _insert_query text;
 _delete_query text;
 begin
	 _delete_query:='delete from "global".'||$2||' where True';
	raise notice '%', _delete_query;
 		execute _delete_query;
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='source_column_name' then 
		if _value is null then _source_column_name='null'; else _source_column_name=E'\''||_value||E'\''; end if;
 		elsif _key ='source_column_datatype' then 
		if _value is null then _source_column_datatype='null'; else _source_column_datatype=E'\''||_value||E'\''; end if;
		elsif _key ='required_in_product' then 
 		_required_in_product = _value;
		elsif _key='generic_column_name' then
        _generic_column_name=_value;
        elsif _key='is_pk' then
        _is_pk=_value;
        elsif _key='generic_column_datatype' then
        _generic_column_datatype=_value;
        elsif _key='formula' then
		if _value is null then _formula='null'; else _formula=E'\''||replace(replace(_value,E'\'','"'),E'\"','''''')||E'\''; end if;
		raise notice '%', _formula;
        elsif _key='is_attribute' then
        _is_attribute=_value;
        elsif _key='is_hierarchy' then
        _is_hierarchy=_value;
        elsif _key='hierarchy_level' then
		if _value is null then _hierarchy_level='null'; else _hierarchy_level=E'\''||_value||E'\''; end if;
        elsif _key='is_null_allowed' then
        _is_null_allowed=_value;
        elsif _key='unique_by' then
		if _value is null then _unique_by='null'; else _unique_by=E'\''||_value||E'\''; end if;
        elsif _key='display_name' then
		if _value is null then _display_name='null'; else _display_name=E'\''||_value||E'\''; end if;
        elsif _key='is_partition_col' then
		if _value is null then _is_partition_col='null'; else _is_partition_col=E'\''||_value||E'\''; end if;
        elsif _key='is_clustering_col' then
		if _value is null then _is_clustering_col='null'; else _is_clustering_col=E'\''||_value||E'\''; end if;
 		end if;
 		end loop;
		
 		_insert_query:='INSERT INTO "global".'||$2||' (source_column_name, source_column_datatype, required_in_product, generic_column_name, is_pk, generic_column_datatype, formula, is_attribute, is_hierarchy, hierarchy_level, is_null_allowed, unique_by, display_name, is_partition_col, is_clustering_col)
                            VALUES('||_source_column_name||', '||_source_column_datatype||', '||_required_in_product||', '''||_generic_column_name||''', '||_is_pk||', '''||_generic_column_datatype||''', '||_formula||', '||_is_attribute||', '||_is_hierarchy||', '||_hierarchy_level||', '||_is_null_allowed||', '||_unique_by||', '||_display_name||', '||_is_partition_col||', '||_is_clustering_col||');';
 		
		raise notice '%', _insert_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;