--liquibase formatted sql
--changeset dharshan.patil@impactanalytics.co:Added_oms_shipment_list_constraint_update1 runOnChange:true stripComments:false splitStatements:false context:MTP-81294_3 labels:oms_shipment_list_constraint_update2
--comment: Added moq_tolerance 

DROP FUNCTION IF EXISTS inventory_smart.oms_shipment_list_constraint(refcursor, jsonb, text[], jsonb);


CREATE OR REPLACE FUNCTION inventory_smart.oms_shipment_list_constraint(refcursor, jsonb, text[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_pa_query text := '';
/*
 description: inputs $2 = product_filter, $3 = validity, $4 = meta filters.
This function is modified to list constraints for shipments based on the provided filters and product attributes.
Sample call: select * from inventory_smart.oms_shipment_list_constraint('cur', '{
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
    "l4_name": [],
    "article": [],
    "l3_name": [],
    "l2_name": []
}'::jsonb,'{"(11-11-2023, 12-12-2023)"}'::text[], '{"limit":{
"limit":10, "page":1
}}'::jsonb); 

fetch all from "cur";*/

begin
    
    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    
    raise notice '_pa_query: %', _pa_query;

    -- Construct WHERE clause to join with `product_attributes_filter`
     _where := 'join (select * from global.product_attributes_filter ' || _pa_query || ' and active_ladder_flg = True  and replenishment_status IN (''Laddering'',''Laddering and Ordering'')) paf';

    -- Construct the main query part to fetch the desired fields
    _query_part := 'SELECT
        paf.style,
        ocs.channel,
        paf.size,
        paf.l0_name,
        paf.style_description,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.collection,
        paf.class,
        paf.season,
        ocs.min_replenishment_quantity,
        ocs.max_replenishment_quantity,
        ocs.order_multiple,
        ocs.product_code,
        ocs.moq_tolerance,
        ocs.id as shipment_id
    FROM "inventory_smart".oms_constraints_shipment ocs
    ' || _where;

    -- Combine the query part with additional filters
    _query_combine := 'SELECT A.*
        FROM (' || _query_part || ' ON paf.product_code = ocs.product_code) AS A
        ' || global.form_table_query($4);
    
    raise notice 'query_combine: %', _query_combine;

    -- Execute the combined query and open the cursor
    open $1 for execute _query_combine;
    return $1;

END
$function$
;
