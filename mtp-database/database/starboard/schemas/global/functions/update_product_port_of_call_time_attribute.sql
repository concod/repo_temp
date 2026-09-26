--liquibase formatted sql
--changeset osho.sharma:update_product_port_of_call_time_attribute_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-126961
--comment: shared update SP for set-all, unmap-set-all, modify-time-period
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_product_port_of_call_time_attribute(jsonb, int4);
CREATE OR REPLACE FUNCTION global.update_product_port_of_call_time_attribute(payload jsonb, user_id int4)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE global.product_port_of_call_time_attributes t
    SET
        is_eligible = COALESCE((r.is_eligible)::boolean, t.is_eligible),
        validity    = CASE WHEN r.has_validity THEN (r.validity)::daterange ELSE t.validity END,
        updated_by  = user_id,
        updated_at  = now()
    FROM (
        SELECT
            item->>'product_code' AS product_code,
            item->>'store_code'   AS store_code,
            item->>'port_code'    AS port_code,
            item->>'is_eligible'  AS is_eligible,
            item->>'validity'     AS validity,
            item ? 'validity'     AS has_validity
        FROM jsonb_array_elements(COALESCE(payload->'items', '[]'::jsonb)) AS item
    ) r
    WHERE t.product_code = r.product_code
      AND t.store_code   = r.store_code
      AND t.port_code    = r.port_code;
END
$function$;
