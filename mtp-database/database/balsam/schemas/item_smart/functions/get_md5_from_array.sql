--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:get_md5_from_array runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:get_lead_week
--comment: initial changeset for get_md5_from_array
--rollback: SELECT 1
DROP FUNCTION  IF EXISTS item_smart.get_md5_from_array(input_array text[]);
CREATE OR REPLACE FUNCTION item_smart.get_md5_from_array(input_array text[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    cleaned_array text[];
    concatenated_text text;
    result_md5 text;
BEGIN
    -- Clean each element of the array using regexp_replace
    SELECT array_agg(regexp_replace(elem, '[ /.-]', '', 'g'))
    INTO cleaned_array
    FROM unnest(input_array) AS elem;

    -- Join the cleaned array elements with '_'
    concatenated_text := array_to_string(cleaned_array, '_');

    -- Generate the MD5 hash of the concatenated string
    result_md5 := md5(concatenated_text);

    RETURN result_md5;
END;
$function$
;
