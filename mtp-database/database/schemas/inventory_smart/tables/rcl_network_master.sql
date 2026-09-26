--liquibase formatted sql
--changeset shashwat.yadav@impactanalytics.co:rcl_network_master_modified stripComments:false splitStatements:false context:Release_1_0 labels:MTP-74818
--comment: initial changeset for rcl_network_master

CREATE TABLE IF NOT EXISTS inventory_smart.rcl_network_master (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	supply_network int4 NULL,
	validity daterange NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	CONSTRAINT unique_rcl_rule_validity UNIQUE (rcl_code, rule_code, validity),
	CONSTRAINT rcl_network_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_network_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_network_master_rule_fk FOREIGN KEY (rcl_code, rule_code) REFERENCES inventory_smart.rcl_network_rule(rcl_code, rule_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_network_master_supply_network_fk FOREIGN KEY (supply_network) REFERENCES inventory_smart.supply_network(network_id) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);