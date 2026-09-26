--liquibase formatted sql
--changeset osho.sharma:validate_product_port_of_call_mapping_data_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-126961
--comment: validate port of call eligibility date inputs
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.validate_product_port_of_call_mapping_data(jsonb);
CREATE OR REPLACE FUNCTION global.validate_product_port_of_call_mapping_data(payload jsonb)
RETURNS TABLE(status boolean, message text)
LANGUAGE plpgsql
AS $function$
DECLARE
    item jsonb;
    parsed_range daterange;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'items', '[]'::jsonb))
    LOOP
        IF (item->>'validity') IS NULL THEN
            RETURN QUERY SELECT false, 'validity is required'::text;
            RETURN;
        END IF;

        BEGIN
            parsed_range := (item->>'validity')::daterange;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT false, 'Invalid validity range format'::text;
            RETURN;
        END;

        IF isempty(parsed_range) THEN
            RETURN QUERY SELECT false, 'validity range must not be empty'::text;
            RETURN;
        END IF;
    END LOOP;

    RETURN QUERY SELECT true, 'Validation passed'::text;
END
$function$;
