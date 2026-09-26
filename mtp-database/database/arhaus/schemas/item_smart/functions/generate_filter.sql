--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:generate_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:generate_filters 
--comment: generate_filters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.generate_filter(text);

CREATE OR REPLACE FUNCTION item_smart.generate_filter(ph_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN JSONB_BUILD_ARRAY(
        JSONB_BUILD_OBJECT(
            'attribute_name', 'product_code',
            'value', JSONB_BUILD_ARRAY(ph_code),
            'operator', 'in'
        )
    );
END;
$function$
;
