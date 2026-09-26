--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_replace_values runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_replace_values

DROP FUNCTION if exists price_promo.fn_replace_values;

CREATE OR REPLACE FUNCTION price_promo.fn_replace_values(
    p_value_string text,
    p_replacements jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    _result text;
    _key text;
    _value text;
BEGIN
    _result := p_value_string;
    
    FOR _key, _value IN 
        SELECT key, value::text 
        FROM jsonb_each(p_replacements)
    LOOP
        _result := replace(_result, _key, _value);
    END LOOP;

    RETURN _result;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error replacing values: %', SQLERRM;
    RETURN NULL;
END;
$function$
; 