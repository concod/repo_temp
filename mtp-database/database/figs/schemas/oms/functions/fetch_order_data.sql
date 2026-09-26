--liquibase formatted sql
--changeset chandranil.ghosh:fetch_order_data_oms_figs_2 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:oms_fetch_orders_vs_1
--comment: Added SP for OMS fetch order data for vs and fixed invalid syntax
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.fetch_order_data(jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.fetch_order_data(filter_criteria jsonb)
 RETURNS TABLE("Vendor ID" text, "Vendor Desc" text, "Date Created" date, "PO ID" text, "SKU ID" text, "ROQ Order Quantity" numeric, cost double precision, "XFTY Date" date, "WH Date" date, "Factory header" character varying, "Ship to" character varying, "Location Name" character varying, article character varying)
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

    -- Build the dynamic SQL query
    v_query := format(
        '
           WITH order_data AS materialized (
			SELECT
			    paf.vendor_id::text AS "Vendor ID",
			    paf.vendor_desc::text AS "Vendor Desc",
			    oor.order_placement_date::date AS "Date Created",
			    CONCAT(ooa.created_at, ''-'', ooa.product_code, ''-'', ooa.loc_code, ''-'', ooa.order_placement_recom_date) AS "PO ID",
			    oor.product_code::text AS "SKU ID",
			    oor.order_quantity::numeric AS "ROQ Order Quantity",
			    oor.order_cost::float8 AS cost,
			    (oor.order_placement_date::date + (lead.lead_time - lead.shipping_lead_time)) AS "XFTY Date",
			    (oor.order_placement_date::date + lead.lead_time) AS "WH Date",
			    paf.factory AS "Factory header",
			    oor.loc_code AS "Ship to",
			    oor.loc_code AS "Location Name",
			    lead.article
			FROM global.product_attributes_filter AS paf
			JOIN inventory_smart.oms_orders_recommended AS oor
			    ON paf.product_code = oor.product_code
			JOIN inventory_smart.oms_orders_approved AS ooa
			    ON paf.product_code = ooa.product_code
			JOIN inventory_smart.oms_constraints_lead_time AS lead
			    ON paf.article = lead.article
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
$function$
;
