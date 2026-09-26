--liquibase formatted sql
--changeset pradeep.kumar@impactanalytics.co:supply_network stripComments:false splitStatements:false context:VS_inv_smart labels:liquibase_project_start
--comment: initial changeset for supply_network

CREATE TABLE IF NOT EXISTS inventory_smart.supply_network (
	network_id serial4 NOT NULL,
	network_name public."citext" NOT NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	created_by int4 NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	is_default bool DEFAULT false NULL,
	CONSTRAINT supply_network_pkey PRIMARY KEY (network_id),
	CONSTRAINT uniq_network_name UNIQUE (network_name),
	CONSTRAINT temp_supply_network_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT temp_supply_network_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);