
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_rule_products_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_rule_products_mapping_v2

CREATE TABLE base_pricing.bp_rule_products_mapping (
	rule_id int4 NOT NULL,
	product_id int8 NOT NULL,
	l0_cid int4 NULL,
	l1_cid int4 NULL,
	l2_cid int4 NULL,
	l3_cid int4 NULL,
	l4_cid int4 NULL,
	l5_cid int4 NULL,
	CONSTRAINT bp_rule_products_mapping_pkey PRIMARY KEY (rule_id, product_id),
	CONSTRAINT bp_rule_products_mapping_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES base_pricing.bp_rule_master(id) ON DELETE CASCADE
)
PARTITION BY LIST (rule_id);
CREATE INDEX idx_rule_products_mapping_rule ON  base_pricing.bp_rule_products_mapping USING btree (rule_id);