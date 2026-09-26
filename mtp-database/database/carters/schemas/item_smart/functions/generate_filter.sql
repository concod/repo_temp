--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:ph-new-sku runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit_ph-new-sku
--comment: initial changeset for ph-new-sku
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.generate_filter(text);

CREATE OR REPLACE FUNCTION item_smart.generate_filter(ph_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN JSONB_BUILD_ARRAY(
        JSONB_BUILD_OBJECT(
            'attribute_name', 'style',
            'value', JSONB_BUILD_ARRAY(ph_code),
            'operator', 'in'
        )
    );
END;
$function$
;
