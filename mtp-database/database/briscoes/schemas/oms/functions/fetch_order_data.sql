--liquibase formatted sql
--changeset chandranil.ghosh:fetch_order_data_oms_briscoes_4 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:oms_fetch_orders_vs_1
--comment: Added SP for OMS fetch order data for vs and fixed invalid syntax
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.fetch_order_data(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.fetch_order_data(filter_criteria jsonb)
RETURNS TABLE(
    article VARCHAR,
    qty INTEGER,
    uom VARCHAR,
    site VARCHAR,
    purchase_group VARCHAR,
    del_date date,
    special_cost VARCHAR,
    atab_rel INTEGER,
    order_id VARCHAR,
    vendor_id VARCHAR,
    article_name VARCHAR,
    vendor_article VARCHAR,
    each_qty INTEGER,
    line_cost double precision
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
                paf.product_code AS article,
                CAST(oor.order_quantity / uom.factor AS INTEGER) AS qty,
                uom.from_unit AS uom,
                oor.loc_code AS site,
                paf.purchasing_group_id AS purchase_group,
                oor.expected_receipt_date::date AS del_date,
                NULL::VARCHAR AS special_cost,
                3 AS atab_rel,
                oor.id::VARCHAR AS order_id,
                paf.vendor_id AS vendor_id,
                paf.product_name AS article_name,
                paf.vendor_article_numb AS vendor_article,
                oor.order_quantity AS each_qty,
                oor.order_quantity * paf.cost AS line_cost
            FROM inventory_smart.oms_orders_recommended oor
            JOIN global.product_attributes_filter paf
                ON paf.product_code = oor.product_code
            JOIN inventory_smart.uom uom
                ON uom.item_id = oor.product_code
            WHERE oor.id IN (
                SELECT id FROM inventory_smart.oms_orders_recommended 
                WHERE %I::text = ANY($1)
            )
        )
        SELECT * FROM order_data',
        v_column_name
    );

    -- Execute the query dynamically, passing the list of IDs
    RETURN QUERY EXECUTE v_query USING array(SELECT jsonb_array_elements_text(v_values));
END;
$function$;