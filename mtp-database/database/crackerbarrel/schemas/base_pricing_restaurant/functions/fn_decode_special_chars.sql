--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_decode_special_chars stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_decode_special_chars

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_decode_special_chars;


CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_decode_special_chars(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF input_text IS NULL THEN 
    RETURN NULL;
  END IF;

  RETURN regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
             input_text,
           '__ia_char_01', '''', 'gi'),
           '__ia_char_02', '"', 'gi'),
           '__ia_char_03', '/', 'gi'),
           '__ia_char_04', '\\', 'gi'),
           '__ia_char_05', '`', 'gi'),
           '__ia_char_06', '~', 'gi'),
           '__ia_char_07', '!', 'gi'),
           '__ia_char_08', '@', 'gi'),
           '__ia_char_09', '#', 'gi'),
           '__ia_char_10', '$', 'gi'),
           '__ia_char_11', '%', 'gi'),
           '__ia_char_12', '^', 'gi'),
           '__ia_char_13', '&', 'gi'),
           '__ia_char_14', '*', 'gi'),
           '__ia_char_15', '(', 'gi'),
           '__ia_char_16', ')', 'gi'),
           '__ia_char_19', '=', 'gi'),
           '__ia_char_20', '+', 'gi'),
           '__ia_char_21', '{', 'gi'),
           '__ia_char_22', '}', 'gi'),
           '__ia_char_23', '[', 'gi'),
           '__ia_char_24', ']', 'gi'),
           '__ia_char_25', '|', 'gi'),
           '__ia_char_27', ';', 'gi'),
           '__ia_char_28', '<', 'gi'),
           '__ia_char_29', '>', 'gi'),
           '__ia_char_30', ',', 'gi'),
           '__ia_char_32', '?', 'gi');
END;
$function$
;
