--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:add_masking_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_masking_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_masking_mapping(
	input jsonb,
	user_id integer);
CREATE OR REPLACE FUNCTION data_platform.add_masking_mapping(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
declare 
    _input_json json; 
    _key text;
    _value text;
    _generic_schema_mapping text;
    _generic_column_name text;
    _masking_id int;
    _user int := $2; 
    _created_at timestamp := now();
    _insert_query text;
    _delete_query text;
begin
    for _key, _value in SELECT * FROM jsonb_each_text($1::jsonb)
        loop 
            if  _key = 'generic_schema_mapping' then 
                _generic_schema_mapping = _value;
            elsif _key = 'generic_column_name' then 
                _generic_column_name = _value;
            elsif _key = 'masking_id' then
                _masking_id = _value;
            end if;
        end loop;
        _insert_query := 'INSERT INTO "data_platform".masking_mapping (generic_schema_mapping, generic_column_name, masking_id, created_by, created_at)  
                          VALUES ('''||_generic_schema_mapping||''','''||_generic_column_name||''','||_masking_id||','||_user||','''||_created_at||''')';
        RAISE NOTICE '%', _insert_query;
        EXECUTE _insert_query;
end
$FUNCTION$;
