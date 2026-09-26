--liquibase formatted sql
--changeset ayush.keshari@impactanalytics.co:fn_replace_values runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_replace_values

DROP FUNCTION if exists price_promo.fn_replace_values;

CREATE OR REPLACE FUNCTION price_promo.fn_replace_values(p_value_string text, p_replacements jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _result text := p_value_string;
    _key    text;
    _value  text;
BEGIN
    FOR _key, _value IN
      SELECT key, value
      FROM jsonb_each_text(p_replacements)
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

