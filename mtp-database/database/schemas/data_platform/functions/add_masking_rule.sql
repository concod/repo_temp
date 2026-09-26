--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:add_masking_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_masking_rule
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_masking_rule(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.add_masking_rule(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
declare 
    _input_json json; 
    _key text;
    _value text;
    _match_pattern text;
    _replace_pattern text;
    _masking_id int;
    _user int := $2; 
    _created_at timestamp := now();
    _insert_query text;
    _delete_query text;
begin   
    for _key, _value in SELECT * FROM jsonb_each_text($1::jsonb)
        loop 
            if  _key = 'match_pattern' then 
            if _value is null then _match_pattern='null'; else _match_pattern=E'\''||replace(replace(_value,E'\'','"'),E'\"','''''')||E'\''; end if;
            elsif _key = 'replace_pattern' then 
                if _value is null then _replace_pattern='null'; else _replace_pattern=E'\''||replace(replace(_value,E'\'','"'),E'\"','''''')||E'\''; end if;
            end if;
        end loop;
        _insert_query := 'INSERT INTO "data_platform".masking_rules (match_pattern, replace_pattern, created_by, created_at)  
                          VALUES ('||_match_pattern||','||_replace_pattern||','||_user||','''||_created_at||''' )';
        RAISE NOTICE '%', _insert_query;
        EXECUTE _insert_query;
end
$FUNCTION$;