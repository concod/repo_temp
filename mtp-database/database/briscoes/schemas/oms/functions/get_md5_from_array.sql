--liquibase formatted sql
--changeset Shaik.Azmathulla@impactanalytics.co:get_md5_from_array runOnChange:true stripComments:false splitStatements:false context:MTP-97176 labels:get_md5_from_array
--comment: Created new SP for md5 array

DROP FUNCTION IF EXISTS inventory_smart.get_md5_from_array;

CREATE OR REPLACE FUNCTION inventory_smart.get_md5_from_array(input_array text[])
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
$function$;
