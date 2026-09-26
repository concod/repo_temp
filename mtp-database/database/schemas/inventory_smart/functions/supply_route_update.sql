--liquibase formatted sql
--changeset shashwat.yadav:supply_route_update runOnChange:true stripComments:false splitStatements:false context:MTP-72821 labels:MTP-72821
--comment: MTP-72821 Add new supply routes by network_id
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.supply_route_update(jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.supply_route_update(p_payload jsonb, p_updated_by integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    route RECORD;
    p_network_id integer := CAST(p_payload->>'network_id' AS integer);
BEGIN

    DELETE FROM inventory_smart.supply_route
    WHERE network_id = p_network_id;

    UPDATE inventory_smart.supply_network
    SET updated_by = p_updated_by,
        updated_at = NOW()
    WHERE network_id = p_network_id;

    FOR route IN SELECT * FROM jsonb_to_recordset(p_payload->'routes') AS (
        route_type_id integer,
        source_node_id integer,
        destination_node_id integer,
        shipping_mode text,
        is_terminal_node boolean,
        is_bidirectional boolean,
        is_primary boolean,
        priority integer,
        lead_time integer,
        updated_by integer
    )
    LOOP
        BEGIN
            INSERT INTO inventory_smart.supply_route (
                network_id,
                route_type_id,
                source_node_id,
                destination_node_id,
                shipping_mode,
                is_terminal_node,
                is_bidirectional,
                is_primary,
                priority,
                lead_time,
                updated_by
            ) VALUES (
                p_network_id,
                route.route_type_id,
                route.source_node_id,
                route.destination_node_id,
                route.shipping_mode,
                COALESCE(route.is_terminal_node, false),
                COALESCE(route.is_bidirectional, false),
                route.is_primary,
                route.priority,
                route.lead_time,
                p_updated_by
            );
        EXCEPTION
            WHEN unique_violation THEN
                RETURN jsonb_build_object(
                    'status', 'true',
                    'message', format('Duplicate route detected for network_id: %s', p_network_id)
                );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'true',
        'message', format('Update successful for network_id: %s', p_network_id)
    );
END;
$function$
;