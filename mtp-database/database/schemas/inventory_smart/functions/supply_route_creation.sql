--liquibase formatted sql
--changeset shashwat.yadav:supply_route_creation runOnChange:true stripComments:false splitStatements:false context:MTP-72821 labels:MTP-72821
--comment: MTP-72821 Create supply route
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.supply_route_creation(varchar, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.supply_route_creation(network_name character varying, created_by integer, routes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    p_network_id INTEGER;
    route JSONB;
    result JSONB;
BEGIN

    IF EXISTS (SELECT 1 FROM inventory_smart.supply_network sn WHERE sn.network_name = supply_route_creation.network_name) THEN
        RETURN jsonb_build_object(
            'status', false,
            'message', 'Network name already exists'
        );
    END IF;

    BEGIN
        INSERT INTO inventory_smart.supply_network (network_name, created_by, updated_at)
        VALUES (network_name, created_by, NULL)
        RETURNING network_id INTO p_network_id;

        FOR route IN SELECT * FROM jsonb_array_elements(routes) LOOP
            INSERT INTO inventory_smart.supply_route (
                network_id,
                route_type_id,
                source_node_id,
                destination_node_id,
                shipping_mode,
                is_terminal_node,
                is_bidirectional,
                is_primary,
                lead_time,
                priority,
                created_by,
				updated_at
            ) VALUES (
                p_network_id,
                (route->>'route_type_id')::INTEGER,
                (route->>'source_node_id')::INTEGER,
                (route->>'destination_node_id')::INTEGER,
                route->>'shipping_mode',
                COALESCE((route->>'is_terminal_node')::BOOLEAN, false),
                COALESCE((route->>'is_bidirectional')::BOOLEAN, false),
                (route->>'is_primary')::BOOLEAN,
                (route->>'lead_time')::INTEGER,
                (route->>'priority')::INTEGER,
                created_by,
				NULL
            );
        END LOOP;

        result := jsonb_build_object(
                'status', true,
                'message', 'Network created successfully',
                'id', p_network_id
            );

    EXCEPTION
        WHEN OTHERS THEN
            result := jsonb_build_object(
                'status', false,
                'message', SQLERRM
            );
    END;

    RETURN result;
end;
$function$
;