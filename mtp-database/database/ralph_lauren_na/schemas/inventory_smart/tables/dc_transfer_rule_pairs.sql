--liquibase formatted sql
--changeset liquibase:dc_transfer_rule_pairs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_transfer_rule_pairs

CREATE TABLE inventory_smart.dc_transfer_rule_pairs (
	pair_id serial4 NOT NULL,
	rule_id int4 NOT NULL,
	src_dc varchar(50) NOT NULL,
	des_dc varchar(50) NOT NULL,
	priority int4 NULL,
	parameter_weeks int4 NULL,
	src_sell_through_threshold numeric(5, 2) NULL,
	des_sell_through_threshold numeric(5, 2) NULL,
	max_transfer_quantity int4 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz NULL,
	CONSTRAINT dc_transfer_rule_pairs_pkey PRIMARY KEY (pair_id),
	CONSTRAINT dc_transfer_rule_pairs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES inventory_smart.dc_transfer_rule(rule_id) ON DELETE CASCADE
);

--changeset surya.kuruvadi:dc_transfer_rule_pairs_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: renamed 3 columns

ALTER TABLE inventory_smart.dc_transfer_rule_pairs RENAME COLUMN src_sell_through_threshold TO src_wos_threshold;
ALTER TABLE inventory_smart.dc_transfer_rule_pairs RENAME COLUMN des_sell_through_threshold TO des_wos_threshold;
ALTER TABLE inventory_smart.dc_transfer_rule_pairs RENAME COLUMN max_transfer_quantity TO min_transfer_quantity;

--changeset surya.kuruvadi:dc_transfer_rule_pairs_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: dropped constraint

ALTER TABLE inventory_smart.dc_transfer_rule_pairs DROP CONSTRAINT dc_transfer_rule_pairs_rule_id_fkey;