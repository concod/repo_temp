--liquibase formatted sql
--changeset pradeep.kumar@impactanalytics.co:supply_node stripComments:false splitStatements:false context:VS_inv_smart labels:liquibase_project_start
--comment: initial changeset for supply_node

CREATE TABLE IF NOT EXISTS inventory_smart.supply_node (
	supply_node_id serial4 NOT NULL,
	"name" varchar NOT NULL,
	code varchar NOT NULL,
	"type" varchar NOT NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	CONSTRAINT supply_node_pkey PRIMARY KEY (supply_node_id)
);

ALTER table inventory_smart.supply_node
ADD CONSTRAINT supply_node_ukey UNIQUE (code);