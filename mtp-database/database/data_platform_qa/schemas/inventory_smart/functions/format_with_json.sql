--liquibase formatted sql
--changeset suba.nataraj:intial runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:liquibase_project_start
--comment: changes to handle special case of channel to be in single quotes
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