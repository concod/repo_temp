--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:impute_special_characters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for impute_special_characters

DROP FUNCTION IF EXISTS price_promo.impute_special_characters;
CREATE OR REPLACE FUNCTION price_promo.impute_special_characters(input_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    result_value TEXT;
BEGIN
    -- Initialize result with input value
    result_value := input_value;
    
    -- Replace all special character placeholders with actual characters
    result_value := REPLACE(result_value, '__ia_char_01', '''');  -- Single quote
    result_value := REPLACE(result_value, '__ia_char_02', '"');   -- Double quote
    result_value := REPLACE(result_value, '__ia_char_03', '/');   -- Forward slash
    result_value := REPLACE(result_value, '__ia_char_04', '\');   -- Backslash
    result_value := REPLACE(result_value, '__ia_char_05', '`');   -- Backtick
    result_value := REPLACE(result_value, '__ia_char_06', '~');   -- Tilde
    result_value := REPLACE(result_value, '__ia_char_07', '!');   -- Exclamation
    result_value := REPLACE(result_value, '__ia_char_08', '@');   -- At symbol
    result_value := REPLACE(result_value, '__ia_char_09', '#');   -- Hash
    result_value := REPLACE(result_value, '__ia_char_10', '$');   -- Dollar sign
    result_value := REPLACE(result_value, '__ia_char_11', '%');   -- Percent
    result_value := REPLACE(result_value, '__ia_char_12', '^');   -- Caret
    result_value := REPLACE(result_value, '__ia_char_13', '&');   -- Ampersand
    result_value := REPLACE(result_value, '__ia_char_14', '*');   -- Asterisk
    result_value := REPLACE(result_value, '__ia_char_15', '(');   -- Left parenthesis
    result_value := REPLACE(result_value, '__ia_char_16', ')');   -- Right parenthesis
    result_value := REPLACE(result_value, '__ia_char_19', '=');   -- Equals
    result_value := REPLACE(result_value, '__ia_char_20', '+');   -- Plus
    result_value := REPLACE(result_value, '__ia_char_21', '{');   -- Left brace
    result_value := REPLACE(result_value, '__ia_char_22', '}');   -- Right brace
    result_value := REPLACE(result_value, '__ia_char_23', '[');   -- Left bracket
    result_value := REPLACE(result_value, '__ia_char_24', ']');   -- Right bracket
    result_value := REPLACE(result_value, '__ia_char_25', '|');   -- Pipe
    result_value := REPLACE(result_value, '__ia_char_26', ':');   -- Colon
    result_value := REPLACE(result_value, '__ia_char_27', ';');   -- Semicolon
    result_value := REPLACE(result_value, '__ia_char_28', '<');   -- Less than
    result_value := REPLACE(result_value, '__ia_char_29', '>');   -- Greater than
    result_value := REPLACE(result_value, '__ia_char_30', ',');   -- Comma
    result_value := REPLACE(result_value, '__ia_char_31', '.');   -- Period
    result_value := REPLACE(result_value, '__ia_char_32', '?');   -- Question mark
    result_value := REPLACE(result_value, '__ia_char_33', '-');   -- Hyphen
    
    RETURN result_value;
END;
$$;