--liquibase formatted sql
--changeset pradeep.kumar@impactanalytics.co:supply_route stripComments:false splitStatements:false context:VS_inv_smart labels:liquibase_project_start
--comment: initial changeset for supply_route

CREATE TABLE IF NOT EXISTS inventory_smart.supply_route (
	route_id serial4 NOT NULL,
	network_id int4 NULL,
	route_type_id int4 NULL,
	source_node_id int4 NULL,
	destination_node_id int4 NULL,
	shipping_mode public.citext NOT NULL,
	is_terminal_node bool DEFAULT false NOT NULL,
	is_bidirectional bool DEFAULT false NOT NULL,
	is_primary bool DEFAULT false NOT NULL,
	lead_time int4 NOT NULL,
	priority int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	CONSTRAINT supply_route_lead_time_check CHECK ((lead_time > 0)),
	CONSTRAINT supply_route_pkey PRIMARY KEY (route_id),
	CONSTRAINT supply_route_priority_check CHECK ((priority > 0)),
	CONSTRAINT supply_route_uniq_id UNIQUE (network_id, route_type_id, source_node_id, destination_node_id, shipping_mode, is_bidirectional),
	CONSTRAINT supply_route_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT supply_route_destination_node_fk FOREIGN KEY (destination_node_id) REFERENCES inventory_smart.supply_node(supply_node_id) ON DELETE CASCADE,
	CONSTRAINT supply_route_destination_node_id_fkey FOREIGN KEY (destination_node_id) REFERENCES inventory_smart.supply_node(supply_node_id),
	CONSTRAINT supply_route_network_fk FOREIGN KEY (network_id) REFERENCES inventory_smart.supply_network(network_id) ON DELETE CASCADE,
	CONSTRAINT supply_route_network_id_fkey FOREIGN KEY (network_id) REFERENCES inventory_smart.supply_network(network_id),
	CONSTRAINT supply_route_route_type_id_fkey FOREIGN KEY (route_type_id) REFERENCES inventory_smart.supply_route_definition(supply_route_id),
	CONSTRAINT supply_route_source_node_fk FOREIGN KEY (source_node_id) REFERENCES inventory_smart.supply_node(supply_node_id) ON DELETE CASCADE,
	CONSTRAINT supply_route_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES inventory_smart.supply_node(supply_node_id),
	CONSTRAINT supply_route_type_fk FOREIGN KEY (route_type_id) REFERENCES inventory_smart.supply_route_definition(supply_route_id) ON DELETE CASCADE,
	CONSTRAINT supply_route_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);