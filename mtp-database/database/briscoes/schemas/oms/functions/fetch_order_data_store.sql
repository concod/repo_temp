--liquibase formatted sql
--changeset piyush.raj:fetch_order_data_store_oms_v3 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:fetch_order_data_store_oms_v1
--comment: Added SP for OMS fetch order data for Briscoes V2S
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.fetch_order_data_store(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.fetch_order_data_store(filter_criteria jsonb)
RETURNS TABLE(
    Article VARCHAR,
    Qty INTEGER,
    UoM VARCHAR,
    Site VARCHAR,
    "purchase group" VARCHAR,
    DelDate date,
    "special cost" INTEGER,
    "Order id" VARCHAR,
    "Vendor id" VARCHAR,
    "Article Name" VARCHAR,
    "vendor article" VARCHAR,
    "each qty" INTEGER,
    "line cost" double precision
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
    'WITH order_data AS (
        SELECT
            paf.product_code AS Article,
            CAST(oor.order_quantity / uom.factor AS INTEGER) AS Qty,
            uom.from_unit AS UoM,
            oor.store_code AS Site,
            paf.purchasing_group_id AS "purchase group",
            oor.editable_expected_receipt_date::date AS DelDate,
            NULL::integer AS "special cost",
            oor.order_group_id AS "Order id",
            paf.vendor_id AS "Vendor id",
            paf.product_name AS "Article Name",
            paf.vendor_article_numb AS "vendor article",
            oor.order_quantity AS "each qty",
            paf.cost * oor.order_quantity AS "line cost"
        FROM inventory_smart.oms_orders_recommended_store oor
        JOIN global.product_attributes_filter paf
            ON paf.product_code = oor.product_code
        JOIN inventory_smart.uom uom
            ON uom.item_id = oor.product_code
        WHERE oor.id IN (
            SELECT id FROM inventory_smart.oms_orders_recommended_store
            WHERE %I::text = ANY($1)
        )
    )
    SELECT * FROM order_data',
    v_column_name
    );


    -- Execute the query dynamically, passing the values as an array
    RETURN QUERY EXECUTE v_query USING array(SELECT jsonb_array_elements_text(v_values));
END;
$function$;
