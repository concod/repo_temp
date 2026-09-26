--liquibase formatted sql
--changeset nikhil.dhoot:oms_create_manual_order_update_3 runOnChange:true stripComments:false splitStatements:false context:MTP-97029 labels:MTP-97029.
--comment: add style column in oms_orders_recommended table
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_create_manual_order(order_data jsonb, user_id integer);
CREATE OR REPLACE FUNCTION inventory_smart.oms_create_manual_order(order_data jsonb, user_id integer)
 RETURNS TABLE(id integer, product_code character varying, loc_code character varying, vendor_code character varying, rop date)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    INSERT INTO inventory_smart.oms_orders_recommended (
        order_gen_type,
        product_code,
        
        vendor_code,
        vendor_name,
        
        rop,
        
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
        size,
        article,
        loc_code,
        
        fiscal_year,
        fiscal_year_quarter,
        fiscal_year_month,
        fiscal_year_week,
        order_batch_name,
        style,
        elt_projected_bop,
		elt_projected_safety_stock,
        ia_shipment_order_quantity,
        raw_roq
    )
    SELECT 
        'Manual',
        (o->>'product_code')::TEXT,
        
        (o->>'vendor_id')::TEXT,
        (o->>'vendor_desc')::TEXT,
        
        (o->>'order_placement_date')::DATE,
        (o->>'order_quantity')::INT,
        (o->>'cost')::NUMERIC,
        (o->>'order_cost')::NUMERIC,

		CASE 
    		WHEN NULLIF(o->>'roq_constrained_cof', '') IS NOT NULL 
         		THEN (o->>'roq_constrained_cof')::INT
    		ELSE (o->>'order_quantity')::INT
		END,
		CASE 
    		WHEN NULLIF(o->>'roq_unconstrained_cof', '') IS NOT NULL 
         		THEN (o->>'roq_unconstrained_cof')::INT
    		ELSE (o->>'order_quantity')::INT
		END,

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
        (o->>'size'),
        (o->>'article'),
        (o->>'linked_store_code'),
        
        (o->>'fiscal_year'),
        (o->>'fiscal_year_quarter'),
        (o->>'fiscal_year_month')::INT,
        (o->>'fiscal_year_week')::INT,
        (order_data ->> 'order_batch_name')::TEXT,
        (o->>'l4_id')::TEXT,
        (o->>'dc_inv')::INT,
		(o->>'elt_projected_safety_stock_cof')::INT,
        (o->>'ia_shipment_order_quantity')::INT,
        (o->>'raw_roq_cof')::INT
        
    FROM jsonb_array_elements(order_data->'new_orders') AS o
    ON CONFLICT DO NOTHING
    RETURNING 
        inventory_smart.oms_orders_recommended.id,
        inventory_smart.oms_orders_recommended.product_code,
        inventory_smart.oms_orders_recommended.loc_code,
        inventory_smart.oms_orders_recommended.vendor_code,
        inventory_smart.oms_orders_recommended.rop;
END;
$function$
;