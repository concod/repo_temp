--liquibase formatted sql
--changeset shashwat.yadav:supply_route stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Supply Route Table

CREATE TABLE IF NOT EXISTS inventory_smart.supply_route (
    route_id SERIAL4 PRIMARY KEY,
    network_id INT4 REFERENCES inventory_smart.supply_network(network_id),
    route_type_id INT4 REFERENCES inventory_smart.supply_route_definition(supply_route_id),
    source_node_id INT4 REFERENCES inventory_smart.supply_node(supply_node_id),
    destination_node_id INT4 REFERENCES inventory_smart.supply_node(supply_node_id),
    shipping_mode citext NOT NULL,
    is_terminal_node BOOLEAN NOT NULL DEFAULT false,
    is_bidirectional BOOLEAN NOT NULL DEFAULT false,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    lead_time INT4 CHECK (lead_time > 0) NOT NULL,
    priority INT4 CHECK (priority > 0) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    updated_by INT4 NULL,
    created_by INT4 NULL,
    CONSTRAINT supply_route_network_fk FOREIGN KEY (network_id) REFERENCES inventory_smart.supply_network(network_id) ON DELETE CASCADE,
    CONSTRAINT supply_route_type_fk FOREIGN KEY (route_type_id) REFERENCES inventory_smart.supply_route_definition(supply_route_id) ON DELETE CASCADE,
    CONSTRAINT supply_route_source_node_fk FOREIGN KEY (source_node_id) REFERENCES inventory_smart.supply_node(supply_node_id) ON DELETE CASCADE,
    CONSTRAINT supply_route_destination_node_fk FOREIGN KEY (destination_node_id) REFERENCES inventory_smart.supply_node(supply_node_id) ON DELETE CASCADE,
    CONSTRAINT supply_route_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT supply_route_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT supply_route_unique_id UNIQUE (network_id, route_type_id, source_node_id, destination_node_id, shipping_mode, is_bidirectional)
);
