--liquibase formatted sql
--changeset priyansh_gautam:oms_create_manual_order_update_6 runOnChange:true stripComments:false splitStatements:false context:MTP-97029 labels:MTP-97029v3
--comment: null handling in oms_create_manual_order function

DROP FUNCTION IF EXISTS oms.oms_create_manual_order(jsonb, int4);

CREATE OR REPLACE FUNCTION oms.oms_create_manual_order(
    order_data jsonb,
    user_id integer
)
RETURNS TABLE(
    id bigint,
    product_code character varying,
    loc_code character varying,
    vendor_code character varying,
    rop date
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    INSERT INTO oms.oms_orders_recommended (
        order_gen_type,
        product_code,
        
        vendor_code,
        vendor_name,
        
        rop,
        
        order_quantity,
        order_quantity_eaches,
        pack_id,
        pack_config,
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
        loc_code,
        
        fiscal_year,
        fiscal_year_quarter,
        fiscal_year_month,
        fiscal_year_week,
        week_start_date,
        order_batch_name
    )
    SELECT 
        'Manual',
        (o->>'product_code')::TEXT,
        
        (o->>'vendor_code')::TEXT,
        (o->>'primary_vendor_name')::TEXT,
        
        (o->>'order_placement_date')::DATE,
        NULLIF(o->>'order_quantity', '')::INT,
        NULLIF(o->>'order_quantity_eaches', '')::INT,
        (o->>'pack_id')::TEXT,
        NULLIF(o->>'pack_config', '')::INT,
        NULLIF(o->>'cost', '')::NUMERIC,
        NULLIF(o->>'order_cost', '')::NUMERIC,
        NULLIF(o->>'order_quantity', '')::INT,
        NULLIF(o->>'order_quantity', '')::INT,
        (o->>'order_placement_date')::DATE,
        (o->>'order_placement_date')::DATE,
        (o->>'expected_receipt_date')::DATE,
        (o->>'expected_receipt_date')::DATE,
        (o->>'order_placement_date')::DATE,
        NULLIF(o->>'lead_time', '')::INT,
        NULLIF(o->>'lead_time', '')::INT,
        NULLIF(o->>'min_order_quantity_sku', '')::INT,
        NULLIF(o->>'min_order_quantity_style', '')::INT,
        NULLIF(o->>'min_order_quantity_shipment', '')::INT,
        NULLIF(o->>'max_order_quantity_sku', '')::INT,
        NULLIF(o->>'product_attribute_5', '')::INT,

        1,
        user_id,  
        CURRENT_TIMESTAMP,
        user_id,
        CURRENT_TIMESTAMP,
        CURRENT_DATE + 7,
        FALSE,
        TRUE,
        NULLIF(o->>'inventory_hold', '')::INT,
        (o->>'month'),
        (o->>'article'),
        (o->>'size'),
        (o->>'article'),
        '-',
        (o->>'loc_code'),
        
        NULLIF(o->>'fiscal_year', '')::INT,
        NULLIF(o->>'fiscal_year_quarter', '')::INT,
        NULLIF(o->>'fiscal_year_month', '')::INT,
        NULLIF(o->>'fiscal_year_week', '')::INT,
        (o->>'week_start_date')::DATE,
        (order_data ->> 'order_batch_name')::TEXT
        
    FROM jsonb_array_elements(order_data->'new_orders') AS o
    ON CONFLICT DO NOTHING
    RETURNING 
        oms.oms_orders_recommended.id::bigint,
        oms.oms_orders_recommended.product_code,
        oms.oms_orders_recommended.loc_code,
        oms.oms_orders_recommended.vendor_code,
        oms.oms_orders_recommended.rop;
END;
$function$;
