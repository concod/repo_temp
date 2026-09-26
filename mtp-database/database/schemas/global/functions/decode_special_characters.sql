--liquibase formatted sql
--changeset dishaa:decode_special_characters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-I30065
--comment: Function to decode __ia_char_XX encoded values back to their original special characters using global.special_character_formatting table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.decode_special_characters(text);
CREATE OR REPLACE FUNCTION global.decode_special_characters(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    _result text := input_text;
    _rec record;
begin
    IF _result IS NULL OR _result !~ '__ia_char_' THEN
        RETURN _result;
    END IF;

    FOR _rec IN 
        SELECT encoded_value, decoded_value 
        FROM global.special_character_formatting
    LOOP
        _result := replace(_result, _rec.encoded_value, _rec.decoded_value);
    END LOOP;

    RETURN _result;
end
$function$;
