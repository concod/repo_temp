--liquibase formatted sql
--changeset nikhil.dhoot:oms_create_manual_order_store_2 runOnChange:true stripComments:false splitStatements:false context:MTP-98144 labels:MTP-98144
--comment: Initial version of action_oms_orders SP

DROP FUNCTION IF EXISTS inventory_smart.oms_create_manual_order_store(jsonb, int4);
CREATE OR REPLACE FUNCTION inventory_smart.oms_create_manual_order_store(order_data jsonb, user_id integer)
 RETURNS TABLE(id bigint, product_code character varying, store_code character varying, vendor_code character varying, rop date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec jsonb;
    v_l0_name text;
    v_store_code text;
    v_week int;
    v_partition_name text;
    partition_exists boolean;
    l0_part_name text;
    l1_part_name text;
    store_part_name text;
BEGIN
    RETURN QUERY
    INSERT INTO inventory_smart.oms_orders_recommended_store (
		l0_name,
		l1_name,
		l2_name,
		l3_name,
		l5_name,
		l6_name,
        order_gen_type,
        product_code,
        vendor_code,
        vendor_name,
        rop,
        order_placement_date,
        order_quantity,
        unit_cost,
        order_cost,
        roq_constrained,
        roq_unconstrained,
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
        store_code,
        fiscal_year,
        fiscal_year_quarter,
        fiscal_year_month,
        fiscal_year_week,
		projected_delivery_date,
        order_batch_name,
        order_placement_date_original,
        ordering,
        cost,
        sales_org_name,
        region_name,
        store_name,
        style_name,
        store_tier,
        landing_cost,
        comment
    )
    SELECT
		(o->>'l0_name')::TEXT,
		(o->>'l1_name')::TEXT,
		(o->>'l2_name')::TEXT,
		(o->>'l3_name')::TEXT,
		(o->>'l5_name')::TEXT,
		(o->>'l6_name')::TEXT,
        'Manual',
        (o->>'product_code')::TEXT,
        (o->>'vendor_code')::TEXT,
        (o->>'vendor_name')::TEXT,
        (o->>'order_placement_date')::DATE,
        (o->>'order_placement_date')::DATE,
        (o->>'order_quantity')::INT,
        (o->>'cost')::NUMERIC,
        (o->>'order_cost')::NUMERIC,
        (o->>'order_quantity')::INT,
        (o->>'order_quantity')::INT,
        (o->>'order_placement_date')::DATE,
        (o->>'expected_receipt_date')::DATE,
        (o->>'editable_expected_receipt_date')::DATE,
        (o->>'order_placement_date')::DATE,
        (o->>'lead_time')::INT,
        (o->>'effective_lead_time')::INT,
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
        (o->>'style_name'),
        (o->>'size'),
        (o->>'article'),
        (o->>'l1_name'),
        (o->>'store_code'),
        fdm.fiscal_year,
        fdm.fiscal_year_quarter,
        fdm.fiscal_year_month,
        fdm.fiscal_year_week,
		(o->>'editable_expected_receipt_date')::DATE,
        (order_data->>'order_batch_name')::TEXT,
        (o->>'order_placement_date')::DATE,
        'Y',
        (o->>'cost')::NUMERIC,
        (o->>'sales_org_name')::TEXT,
        (o->>'region_name')::TEXT,
        (o->>'store_name')::TEXT,
        (o->>'style_name')::TEXT,
        (o->>'store_tier')::TEXT,
        (o->>'landing_cost')::NUMERIC,
        (order_data->>'comment')::TEXT

    FROM jsonb_array_elements(order_data->'new_orders') AS o
    INNER JOIN global.fiscal_date_mapping fdm ON fdm.calendar_date = (o->>'order_placement_date')::DATE
    ON CONFLICT DO NOTHING
	RETURNING 
	    inventory_smart.oms_orders_recommended_store.id::bigint,
	    inventory_smart.oms_orders_recommended_store.product_code::varchar,
	    inventory_smart.oms_orders_recommended_store.store_code::varchar,
	    inventory_smart.oms_orders_recommended_store.vendor_code::varchar,
	    inventory_smart.oms_orders_recommended_store.rop::date;
END;
$function$
;
