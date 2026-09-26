--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:save_oms_cno_off_cycle_draft_update2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604.
--comment: removed product_code column from the function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.save_oms_cno_off_cycle_draft(jsonb, int4);
CREATE OR REPLACE FUNCTION inventory_smart.save_oms_cno_off_cycle_draft(
    draft_data jsonb,
    user_id int4
)
 RETURNS int4
 LANGUAGE plpgsql
AS $function$
/*
    Saves off-cycle order draft data to oms_cno_off_cycle_draft table
    Auto-generates draft_id using sequence and draft_name ("Draft " + draft_id) for all records in the batch
    
    Input: 
      - draft_data: JSONB array with draft records (draft_id and draft_name are auto-generated)
        Example: '[{
            "article": "10074R-SFTND",
            "loc_code": "GXECO1",
            "product_description": "Product Description",
            "brand": "Brand Name",
            "category": "Category",
            "class": "Class",
            "subclass": "Subclass",
            "channel": "DC",
            "vendor_code": "VENDOR1",
            "vendor_name": "Vendor 1",
            "last_order_placement_date": "2024-01-01",
            "last_order_quantity": 100,
            "demand_period_selection": "TWOS",
            "demand_start_date": "2024-01-01",
            "demand_end_date": "2024-01-31",
            "demand_twos": 8,
            "buffer_stock_addition_method": "Service Level",
            "service_level_pct": 95.0,
            "safety_stock_units": 50,
            "safety_stock_wos": 2,
            "sell_through_pct": 80.0,
            "min_order_quantity_sku": 10,
            "min_order_quantity_style_color": 20,
            "min_order_quantity_style": 30,
            "order_generation_date": "2024-01-15",
            "delivery_date": "2024-02-01",
            "lead_time": 15,
            "shipment_mode": "Ship"
        }]'
      - user_id: User ID for created_by and updated_by
    
    Usage:
        SELECT inventory_smart.save_oms_cno_off_cycle_draft(
            '[{"article": "10074R-SFTND", ...}]'::jsonb,
            123
        );
*/
DECLARE
    v_rec jsonb;
    v_current_time timestamptz := CURRENT_TIMESTAMP;
    v_draft_id int4;
    v_draft_name varchar;
BEGIN
    -- Auto-generate draft_id using sequence
    v_draft_id := nextval('inventory_smart.oms_cno_off_cycle_draft_draft_id_seq');
    
    -- Iterate over each record in the draft_data array
    FOR v_rec IN SELECT * FROM jsonb_array_elements(draft_data)
    LOOP
        INSERT INTO inventory_smart.oms_cno_off_cycle_draft (
            draft_id,
            draft_name,
            article,
            loc_code,
            product_description,
            brand,
            category,
            class,
            subclass,
            channel,
            vendor_code,
            vendor_name,
            last_order_placement_date,
            last_order_quantity,
            demand_period_selection,
            demand_start_date,
            demand_end_date,
            demand_twos,
            buffer_stock_addition_method,
            service_level_pct,
            safety_stock_units,
            safety_stock_wos,
            sell_through_pct,
            min_order_quantity_sku,
            min_order_quantity_style_color,
            min_order_quantity_style,
            order_generation_date,
            delivery_date,
            lead_time,
            shipment_mode,
            created_by,
            created_at,
            updated_by,
            updated_at
        ) VALUES (
            v_draft_id,
            v_rec->>'draft_name',
            v_rec->>'article',
            v_rec->>'loc_code',
            v_rec->>'product_description',
            v_rec->>'brand',
            v_rec->>'category',
            v_rec->>'class',
            v_rec->>'subclass',
            v_rec->>'channel',
            v_rec->>'vendor_code',
            v_rec->>'vendor_name',
            (v_rec->>'last_order_placement_date')::date,
            (v_rec->>'last_order_quantity')::int4,
            v_rec->>'demand_period_selection',
            (v_rec->>'demand_start_date')::date,
            (v_rec->>'demand_end_date')::date,
            (v_rec->>'demand_twos')::int4,
            v_rec->>'buffer_stock_addition_method',
            (v_rec->>'service_level_pct')::float4,
            (v_rec->>'safety_stock_units')::int4,
            (v_rec->>'safety_stock_wos')::int4,
            (v_rec->>'sell_through_pct')::float4,
            (v_rec->>'min_order_quantity_sku')::int4,
            (v_rec->>'min_order_quantity_style_color')::int4,
            (v_rec->>'min_order_quantity_style')::int4,
            (v_rec->>'order_generation_date')::date,
            (v_rec->>'delivery_date')::date,
            (v_rec->>'lead_time')::int4,
            v_rec->>'shipment_mode',
            user_id,
            v_current_time,
            user_id,
            v_current_time
        );
    END LOOP;

    RETURN v_draft_id;
END;
$function$;

