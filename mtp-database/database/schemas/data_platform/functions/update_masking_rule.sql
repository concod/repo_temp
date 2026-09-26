--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:update_masking_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_masking_rule
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_masking_rule(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_masking_rule(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
declare 
    _key text;
    _value text;
    _match_pattern text;
    _replace_pattern text;
    _masking_id int;
    _user int := $2; 
    _updated_at timestamp := now();
    _update_query text;
begin
    for _key, _value in SELECT * FROM jsonb_each_text($1::jsonb)
    loop 
        if _key = 'match_pattern' then 
            if _value is null then _match_pattern='null'; else _match_pattern=E'\''||replace(replace(_value,E'\'','"'),E'\"','''''')||E'\''; end if;
        elsif _key = 'replace_pattern' then 
            if _value is null then _replace_pattern='null'; else _replace_pattern=E'\''||replace(replace(_value,E'\'','"'),E'\"','''''')||E'\''; end if;
        elsif _key = 'masking_id' then
            _masking_id = _value;
        end if;
    end loop;
    
    _update_query := 'UPDATE "data_platform".masking_rules 
                     SET match_pattern = '||_match_pattern||', 
                         replace_pattern = '||_replace_pattern||',
                         updated_by = '||_user||', 
                         updated_at = '''||_updated_at||'''
                     WHERE masking_id = '||_masking_id||'';
                     
    RAISE NOTICE '%', _update_query;
    EXECUTE _update_query;
end
$FUNCTION$;
