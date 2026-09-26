--liquibase formatted sql
--changeset aniket.ashis@impactanalytics.co:dc_to_dc_static_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.dc_to_dc_static_list

CREATE TABLE inventory_smart.store_transfer_rule_pairs (
	pair_id serial4 NOT NULL,
	rule_id int4 NOT NULL,
	src_store varchar(50) NOT NULL,
	src_store_name varchar(255) NULL,
	src_country varchar(100) NULL,
	src_region varchar(100) NULL,
	des_store varchar(50) NOT NULL,
	des_store_name varchar(255) NULL,
	des_country varchar(100) NULL,
	des_region varchar(100) NULL,
	priority int4 NULL,
	lead_time int4 NULL,
	min_transfer_qty int4 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz NULL,
	CONSTRAINT store_transfer_rule_pairs_pkey PRIMARY KEY (pair_id),
	CONSTRAINT store_transfer_rule_pairs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES inventory_smart.store_transfer_rule(rule_id) ON DELETE CASCADE
);
CREATE INDEX idx_store_transfer_pairs_rule_id ON inventory_smart.store_transfer_rule_pairs USING btree (rule_id);

--changeset surya.kuruvadi:store_transfer_rule_pairs stripComments:false splitStatements:false context:Release_1_1 labels:MTP-134078
--comment: dropped fkey constraint and added new fkey constraint referencing store_transfer_rules table

ALTER TABLE inventory_smart.store_transfer_rule_pairs drop constraint IF EXISTS store_transfer_rule_pairs_rule_id_fkey;
ALTER TABLE inventory_smart.store_transfer_rule_pairs ADD CONSTRAINT store_transfer_rule_pairs_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES inventory_smart.store_transfer_rules(rule_id) ON DELETE CASCADE;