--liquibase formatted sql
--changeset liquibase:format_with_json runOnChange:true stripComments:false splitStatements:false context:format_with_json fixes labels:format_with_json fixes
--comment: format_with_json fixes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.format_with_json(input text, formatter jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.format_with_json(input text, formatter jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    input text := $1;
    _key text;
    _value text;
BEGIN
	FOR _key, _value IN SELECT * FROM jsonb_each_text($2) loop
		raise notice 'key value % %', _key, _value;
		if _key = 'channel' then
			_value := ''''||_value||'''';
		end if;
		input := REPLACE(input, FORMAT('{%s}', _key), _value);
	
	END LOOP;
	RETURN input;
END
$function$
;