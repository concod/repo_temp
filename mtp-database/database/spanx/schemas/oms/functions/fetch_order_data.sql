--liquibase formatted sql
--changeset chandranil:fetch_order_data_spanx_format_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:fetch_order_data_spanx
--comment: Added SP for OMS fetch orders data using id/group id columns - used in approval flow
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.fetch_order_data(filter_criteria jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.fetch_order_data(filter_criteria jsonb)
 RETURNS TABLE(
 	"DC Code" character varying,
 	"UPC_ID" character varying,
 	"Vendor Code" character varying,
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
    -- Extract column name and value from the JSONB input
    v_column_name := filter_criteria->>'column_name';
    v_values := filter_criteria->'values';

    -- Validate column name to prevent SQL injection
    IF v_column_name NOT IN ('id', 'order_group_id') THEN
        RAISE EXCEPTION 'Invalid column name: %', v_column_name;
    END IF;

    -- Build the dynamic SQL query
    v_query := format(
        'SELECT 
			loc_code AS "DC Code", 
			product_code AS "UPC_ID", 
			vendor_code AS "Vendor Code", 
			order_quantity::integer AS "Quantity", 
			editable_expected_receipt_date AS "Estimated Receipt Date",
			order_placement_date AS "Order Placement Date"
         FROM inventory_smart.oms_orders_recommended
         WHERE %I::text = ANY($1)',
        v_column_name
    );

    -- Execute the query dynamically, passing the values as an array
    RETURN QUERY EXECUTE v_query USING array(SELECT jsonb_array_elements_text(v_values));
END;
$function$
;