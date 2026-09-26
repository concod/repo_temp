--liquibase formatted sql
--changeset nikhil.dhoot:oms_check_approved_orders_store runOnChange:true stripComments:false splitStatements:false context:MTP-98144 labels:MTP-98144
--comment: Initial version of oms_check_approved_orders SP
DROP FUNCTION IF EXISTS inventory_smart.oms_check_approved_orders_store(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_check_approved_orders_store(order_data jsonb)
 RETURNS TABLE(product_code text, vendor_code text, rop date)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH tab AS (
        SELECT 
            (o->>'product_code')::TEXT AS product_code,
            (o->>'vendor_code')::TEXT AS vendor_code,
            (o->>'rop')::DATE AS rop
        FROM jsonb_array_elements(order_data->'orders') AS o
    )
    SELECT 
        t2.product_code, 
        t2.vendor_code, 
        t2.rop
    FROM 
        inventory_smart.oms_orders_approved_store t1
    INNER JOIN 
        tab t2 
    ON 
        t1.product_code = t2.product_code 
        AND t1.vendor_code = t2.vendor_code 
        AND t1.rop = t2.rop;
END;
$function$
;
