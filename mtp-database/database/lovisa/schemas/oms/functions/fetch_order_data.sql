--liquibase formatted sql
--changeset chandranil.ghosh:fetch_order_data_oms_vs_4 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:oms_fetch_orders_vs_2
--comment: Added SP for OMS fetch order data for vs and fixed invalid syntax
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.fetch_order_data(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.fetch_order_data(filter_criteria jsonb)
 RETURNS TABLE(recommended_order_date date, dc_loc_num character varying,  sku_id character varying, recommended_order_qty integer,  order_reason character varying, ship_mode character varying, scheduled_arrival_date date, channel character varying, article character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_column_name TEXT;
    v_values JSONB;
    v_query TEXT;
    v_gen_random_uuid TEXT := gen_random_uuid()::VARCHAR;
BEGIN
    -- Extract column name and values from JSONB input
    v_column_name := filter_criteria->>'column_name';
    v_values := filter_criteria->'values';

    -- Validate column name to prevent SQL injection
    IF v_column_name NOT IN ('id', 'order_group_id') THEN
        RAISE EXCEPTION 'Invalid column name: %', v_column_name;
    END IF;
	raise notice 'v_column_name : %', v_column_name;
    -- Build the dynamic SQL query
    v_query := format(
        '
           WITH order_data AS materialized ( SELECT
                oor.order_placement_recom_date AS recommended_order_date,
                oor.loc_code AS dc_loc_num,
                --paf.l0_name AS brand,
                oor.product_code AS sku_id,
                oor.order_quantity AS recommended_order_qty,
                --paf.inner_pack_units,
                oor.order_reason,
                oor.mode_shipment AS ship_mode,
                oor.expected_receipt_date AS scheduled_arrival_date,
                saf.channel,
                oor.article
                --paf.l5_id AS style_number
            FROM inventory_smart.oms_orders_recommended oor
            JOIN (select distinct display_article from global.product_attributes_filter) paf
                ON paf.display_article = oor.product_code
            LEFT JOIN global.store_attributes_filter saf
                ON saf.store_code = oor.loc_code
            WHERE oor.id IN (
                SELECT id FROM inventory_smart.oms_orders_recommended 
                WHERE %I::text = ANY($1)
            )
)
        SELECT * FROM order_data',
v_column_name
    );

   	raise notice 'v_query : %', v_query;
    -- Execute the query dynamically, passing the list of IDs
    RETURN QUERY EXECUTE v_query USING array(SELECT jsonb_array_elements_text(v_values));
END;
$function$
;
