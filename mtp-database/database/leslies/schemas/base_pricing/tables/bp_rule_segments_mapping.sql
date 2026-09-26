--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_rule_segments_mapping_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_rule_segments_mapping_10

CREATE TABLE base_pricing.bp_rule_segments_mapping (
	rule_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	CONSTRAINT bp_rule_segments_mapping_pkey PRIMARY KEY (rule_id, segment_id),
	CONSTRAINT bp_rule_stores_mapping_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES base_pricing.bp_rule_master(id) ON DELETE CASCADE
)
PARTITION BY LIST (rule_id);
CREATE INDEX idx_rule_segments_mapping_rule ON  base_pricing.bp_rule_segments_mapping USING btree (rule_id);