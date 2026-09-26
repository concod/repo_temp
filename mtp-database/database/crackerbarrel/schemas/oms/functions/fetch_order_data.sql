--liquibase formatted sql
--changeset raja.duraisamy:fetch_order_data_oms_cb_7 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:fetch_order_data_oms_cb_3
--comment: Added SP for OMS fetch order data for CB4 - MTP-132523
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.fetch_order_data(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.fetch_order_data(filter_criteria jsonb)
 RETURNS TABLE(
    "Vendor Code" character varying,
    "DC Code" character varying,
    "Product Code" character varying,
    "Quantity" integer,
    "Estimated Receipt Date" date,
    "Order Placement Date" date
    )
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_column_name TEXT;
    v_values JSONB;
    v_query TEXT;
BEGIN
    -- Extract column name and values from JSONB input
    v_column_name := filter_criteria->>'column_name';
    v_values := filter_criteria->'values';

    -- Validate column name to prevent SQL injection
    IF v_column_name NOT IN ('id', 'order_group_id') THEN
        RAISE EXCEPTION 'Invalid column name: %', v_column_name;
    END IF;

    -- Build the dynamic SQL query
    v_query := format(
        'SELECT
            oor.vendor_code AS "Vendor Code",
            oor.loc_code AS "DC Code",
            
            -- Product Code logic
            CASE 
                WHEN oor.pack_id IS NOT NULL AND oor.pack_id != ''WP'' THEN oor.pack_id
                ELSE oor.product_code
            END AS "Product Code",
            
            -- Quantity logic
            CASE 
                WHEN oor.pack_id IS NOT NULL AND oor.pack_id != ''WP'' THEN 
                    AVG(DISTINCT oor.order_quantity)::integer
                ELSE 
                    SUM(oor.order_quantity_eaches)::integer
            END AS "Quantity",

            oor.editable_expected_receipt_date as "Estimated Receipt Date",
            oor.order_placement_date AS "Order Placement Date"
            
        FROM inventory_smart.oms_orders_recommended oor
         WHERE %I::text = ANY($1)
        GROUP by
            oor.vendor_code,
            oor.loc_code,
            oor.editable_expected_receipt_date,
            oor.order_placement_date,
            oor.pack_id,
            CASE 
                WHEN oor.pack_id IS NOT NULL AND oor.pack_id != ''WP'' THEN oor.pack_id
                ELSE oor.product_code
            END
        ',
        v_column_name
    );

    -- Execute the query dynamically, passing the values as an array
    RETURN QUERY EXECUTE v_query USING array(SELECT jsonb_array_elements_text(v_values));
END;
$function$
;