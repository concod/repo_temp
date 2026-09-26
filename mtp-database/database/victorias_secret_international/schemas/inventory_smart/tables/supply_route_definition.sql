--liquibase formatted sql
--changeset pradeep.kumar@impactanalytics.co:supply_route_definition stripComments:false splitStatements:false context:VS_inv_smart labels:liquibase_project_start
--comment: initial changeset for supply_route_definition

CREATE TABLE IF NOT EXISTS inventory_smart.supply_route_definition (
	supply_route_id serial4 NOT NULL,
	supply_route_name public."citext" NOT NULL,
	source_type varchar NOT NULL,
	destination_type varchar NOT NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	created_by int4 NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	CONSTRAINT supply_route_definition_pkey PRIMARY KEY (supply_route_id),
	CONSTRAINT unq_supply_route_name UNIQUE (supply_route_name),
	CONSTRAINT supply_route_definition_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT supply_route_definition_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);