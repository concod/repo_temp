--liquibase formatted sql
--changeset shashwat.yadav:supply_route_by_id runOnChange:true stripComments:false splitStatements:false context:MTP-72821 labels:MTP-72821
--comment: MTP-72821 Retrieve supply route by network_id
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.supply_route_by_id(refcursor, integer);
CREATE OR REPLACE FUNCTION inventory_smart.supply_route_by_id(refcursor, p_network_id integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    p_network_name VARCHAR;

BEGIN
    SELECT network_name INTO p_network_name
    FROM inventory_smart.supply_network
    WHERE network_id = p_network_id;

    OPEN $1 FOR
    SELECT 
        p_network_id AS network_id,
        p_network_name AS network_name,
        jsonb_agg(
            jsonb_build_object(
                'route_type_id', sr.route_type_id,
                'route_type_name', srd.supply_route_name,
                'source_node_id', sr.source_node_id,
                'source_node_name', sn.name,
                'destination_node_id', sr.destination_node_id,
                'destination_node_name', dn.name,
                'shipping_mode', sr.shipping_mode,
                'is_terminal_node', sr.is_terminal_node,
                'is_bidirectional', sr.is_bidirectional,
                'is_primary', sr.is_primary,
                'priority', sr.priority,
                'lead_time', sr.lead_time
            )
        ) AS routes
    FROM inventory_smart.supply_route sr
    JOIN inventory_smart.supply_route_definition srd ON sr.route_type_id = srd.supply_route_id
    JOIN inventory_smart.supply_node sn ON sr.source_node_id = sn.supply_node_id
    JOIN inventory_smart.supply_node dn ON sr.destination_node_id = dn.supply_node_id
    WHERE sr.network_id = p_network_id
    GROUP BY p_network_id, p_network_name;


    RETURN $1;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error: %', SQLERRM;
END;
$function$
;