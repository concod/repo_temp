--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_rule_stores_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_rule_stores_mapping

CREATE TABLE base_pricing.bp_rule_stores_mapping (
	rule_id int4 NOT NULL,
	store_id int4 NOT NULL,
	s0_cid int4 NULL,
	s1_cid int4 NULL,
	s2_cid int4 NULL,
	s3_cid int4 NULL,
	s4_cid int4 NULL,
	s5_cid int4 NULL,
	CONSTRAINT bp_rule_stores_mapping_pkey PRIMARY KEY (rule_id, store_id),
	CONSTRAINT bp_rule_stores_mapping_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES base_pricing.bp_rule_master(id) ON DELETE CASCADE
)
PARTITION BY LIST (rule_id);

CREATE INDEX idx_rule_stores_mapping_rule ON  base_pricing.bp_rule_stores_mapping USING btree (rule_id);