--liquibase formatted sql
--changeset nikhil.dhoot:oms_create_manual_order_update_1 runOnChange:true stripComments:false splitStatements:false context:MTP-97029 labels:MTP-97029
--comment: Populating order_batch_name column in oms_orders_recommended table
DROP FUNCTION IF EXISTS inventory_smart.oms_create_manual_order(order_data jsonb, user_id integer);

CREATE OR REPLACE FUNCTION inventory_smart.oms_create_manual_order(order_data jsonb, user_id integer)
 RETURNS TABLE(
    id bigint,
    product_code character varying,
    loc_code character varying,
    vendor_code character varying,
    channel character varying,
    order_placement_date date,
    expected_receipt_date date,
    order_gen_type character varying
 )
 LANGUAGE plpgsql
AS $function$
declare
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.oms_create_manual_order', 'Before returning table data',null, jsonb_build_object('$1',order_data,'$2',user_id)) ;
    RETURN QUERY
    INSERT INTO inventory_smart.oms_orders_recommended (
        order_gen_type,
        product_code,
        
        vendor_code,
        vendor_name,
        
        rop,
        raw_roq,
		ia_shipment_order_quantity,
        order_quantity,
        unit_cost,
        order_cost,
        roq_constrained,
        roq_unconstrained,
        order_placement_date,
        order_placement_recom_date,
        expected_receipt_date,
        editable_expected_receipt_date,
        rop_ideal,
        lead_time,
        effective_lead_time,
        min_order_quantity_sku,
        min_order_quantity_style,
        min_order_quantity_shipment,
        max_order_quantity_sku,
        order_multiple,
        order_status_id,
        created_by,
        created_at,
        updated_by,
        updated_at,
        approve_by_date,
        is_deleted,
        is_resolved,
        inventory_hold,
        month,
        style,
        size,
        article,
        channel,
        
        fiscal_year,
        fiscal_year_quarter,
        fiscal_year_month,
        fiscal_year_week,
        order_batch_name
    )
    SELECT 
        'Manual',
        (o->>'product_code')::TEXT,
        
        (o->>'primary_vendor_cd')::TEXT,
        (o->>'primary_vendor_dsc')::TEXT,
        
        (o->>'order_placement_date')::DATE,
        (o->>'order_quantity')::INT,
        (o->>'order_quantity')::INT,
        (o->>'order_quantity')::INT,
        (o->>'cost')::NUMERIC,
        (o->>'order_cost')::NUMERIC,
        (o->>'order_quantity')::INT,
        (o->>'order_quantity')::INT,
        (o->>'order_placement_date')::DATE,
        (o->>'order_placement_date')::DATE,
        (o->>'expected_receipt_date')::DATE,
        (o->>'expected_receipt_date')::DATE,
        (o->>'order_placement_date')::DATE,
        (o->>'lead_time')::INT,
        (o->>'lead_time')::INT,
        (o->>'min_order_quantity_sku')::INT,
        (o->>'min_order_quantity_style')::INT,
        (o->>'min_order_quantity_shipment')::INT,
        (o->>'max_order_quantity_sku')::INT,
        (o->>'order_multiple')::INT,
        1,
        user_id,  
        CURRENT_TIMESTAMP,
        user_id,
        CURRENT_TIMESTAMP,
        CURRENT_DATE + 7,
        FALSE,
        TRUE,
        (o->>'inventory_hold')::INT,
        (o->>'month'),
        (o->>'style'),
        (o->>'size'),
        (o->>'article'),
        (o->>'l1_name'),
        
        (o->>'fiscal_year'),
        (o->>'fiscal_year_quarter'),
        (o->>'fiscal_year_month')::INT,
        (o->>'fiscal_year_week')::INT,
        (order_data ->> 'order_batch_name')::TEXT
        
    FROM jsonb_array_elements(order_data->'new_orders') AS o
    ON CONFLICT DO NOTHING
    RETURNING 
        inventory_smart.oms_orders_recommended.id::bigint,
        inventory_smart.oms_orders_recommended.product_code,
        inventory_smart.oms_orders_recommended.loc_code,
        inventory_smart.oms_orders_recommended.vendor_code,
        inventory_smart.oms_orders_recommended.channel,
        inventory_smart.oms_orders_recommended.order_placement_date,
        inventory_smart.oms_orders_recommended.expected_receipt_date,
        inventory_smart.oms_orders_recommended.order_gen_type;
END;
$function$
;
