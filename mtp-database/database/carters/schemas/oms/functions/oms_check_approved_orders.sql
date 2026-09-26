--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_check_approved_orders_carters_1 runOnChange:true stripComments:false splitStatements:false context:MTP-135352 labels:MTP-135352
--comment: implementing soft delete for oms_orders_approved table

DROP FUNCTION IF EXISTS inventory_smart.oms_check_approved_orders(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_check_approved_orders(order_data jsonb)
 RETURNS TABLE(
    product_code text,
    vendor_code text,
    loc_code text,
    channel text,
    order_placement_date date,
    expected_receipt_date date,
    order_gen_type text
 )
 LANGUAGE plpgsql
AS $function$
declare
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.oms_check_approved_orders', 'Before returning table data',null,jsonb_build_object('$1', order_data));
    RETURN QUERY
    WITH tab AS (
        SELECT 
            (o->>'product_code')::TEXT AS product_code,
            (o->>'vendor_code')::TEXT AS vendor_code,
            (o->>'loc_code')::TEXT AS loc_code,
            (o->>'channel')::TEXT AS channel,
            (o->>'order_placement_date')::DATE AS order_placement_date,
            (o->>'expected_receipt_date')::DATE AS expected_receipt_date,
            (o->>'order_gen_type')::TEXT AS order_gen_type
        FROM jsonb_array_elements(order_data->'orders') AS o
    )
    SELECT 
        t2.product_code, 
        t2.vendor_code, 
        t2.loc_code,
        t2.channel,
        t2.order_placement_date,
        t2.expected_receipt_date,
        t2.order_gen_type
    FROM 
        inventory_smart.oms_orders_approved t1
    INNER JOIN 
        tab t2 
    ON 
        t1.product_code = t2.product_code 
        AND t1.vendor_code = t2.vendor_code 
        AND t1.loc_code = t2.loc_code
        AND t1.channel = t2.channel
        AND t1.order_placement_date = t2.order_placement_date
        AND t1.expected_receipt_date = t2.expected_receipt_date
        AND t1.order_gen_type = t2.order_gen_type
    WHERE
        t1.is_deleted IS NOT TRUE;
END;
$function$
;
