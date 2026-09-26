--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:update_masking_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for update masking_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_masking_mapping(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_masking_mapping(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
declare 
    _key text;
    _value text;
    _generic_schema_mapping text;
    _generic_column_name text;
    _masking_id int;
    _masking_mapping_id int;
    _user int := $2; 
    _updated_at timestamp := now();
    _update_query text;
begin
    for _key, _value in SELECT * FROM jsonb_each_text($1::jsonb)
    loop 
        if _key = 'generic_schema_mapping' then 
            _generic_schema_mapping = _value;
        elsif _key = 'generic_column_name' then 
            _generic_column_name = _value;
        elsif _key = 'masking_id' then
            _masking_id = _value;
        elsif _key = 'masking_mapping_id' then
            _masking_mapping_id = _value;
        end if;
    end loop;
    
    _update_query := 'UPDATE "data_platform".masking_mapping 
                     SET generic_schema_mapping = '''||_generic_schema_mapping||''', 
                         generic_column_name = '''||_generic_column_name||''',
                         masking_id = '||_masking_id||',
                         updated_by = '||_user||', 
                         updated_at = '''||_updated_at||'''
                     WHERE masking_mapping_id = '||_masking_mapping_id||'';
                     
    RAISE NOTICE '%', _update_query;
    EXECUTE _update_query;
end
$FUNCTION$;
