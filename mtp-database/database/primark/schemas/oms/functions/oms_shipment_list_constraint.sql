--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:Added_oms_shipment_list_constraint_update3 runOnChange:true stripComments:false splitStatements:false context:MTP-89550 labels:oms_shipment_list_constraint_update3
--comment: Added moq_tolerance v2

DROP FUNCTION IF EXISTS oms.oms_shipment_list_constraint(refcursor, jsonb, text[], jsonb);
DROP FUNCTION IF EXISTS oms.oms_shipment_list_constraint(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION oms.oms_shipment_list_constraint(refcursor, jsonb, text[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_pa_query text := '';
/*
 description: inputs $2 = product_filter, $3 = meta filters.
This function is modified to list constraints for shipments based on the provided filters and product attributes.
Sample call: select * from oms.oms_shipment_list_constraint('cur', '{
    "l0_name": [{
            "type": "list",
            "operator": "in",
            "values": [
                "2628_2023 Trim a Tree"
            ]
        }],
    "l1_name": [
        {
            "type": "list",
            "operator": "in",
            "values": [
                "410_HOLIDAY EVENTS"
            ]
        }
    ],
    "color": [],
    "size": [],
    "l2_name": [],
    "article": [],
    "l1_name": [],
    "l2_name": []
}'::jsonb, '{"limit":{"limit":10, "page":1}}'::jsonb);

fetch all from "cur";*/

begin
    
    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    
    raise notice '_pa_query: %', _pa_query;

    -- Construct WHERE clause to join with `product_attributes_filter`
     _where := 'join (select * from global.product_attributes_filter ' || _pa_query || ' ) paf';

    -- Construct the main query part to fetch the desired fields
    _query_part := 'SELECT
		paf.article,
        ocs.channel,
        ocs.loc_code,
        paf.size,
        paf.l0_name,
        paf.product_description,
        paf.l2_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        ocs.min_replenishment_quantity,
        ocs.max_replenishment_quantity,
        ocs.order_multiple,
        ocs.product_code,
        ocs.moq_tolerance,
        ocs.id as shipment_id
    FROM "oms".oms_constraints_shipment ocs
    ' || _where;

    -- Combine the query part with additional filters
    _query_combine := 'SELECT A.*
        FROM (' || _query_part || ' ON paf.product_code = ocs.product_code) AS A
        ' || global.form_table_query($3);
    
    raise notice 'query_combine: %', _query_combine;

    -- Execute the combined query and open the cursor
    open $1 for execute _query_combine;
    return $1;

END
$function$
;
