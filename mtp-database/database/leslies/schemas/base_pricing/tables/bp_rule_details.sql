--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_rule_details_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_rule_details_10

CREATE TABLE base_pricing.bp_rule_details (
	id serial4 NOT NULL,
	rule_id int4 NOT NULL,
	rule_data jsonb NOT NULL,
	constructed_rule text NOT NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL,
	CONSTRAINT bp_rule_details_pkey PRIMARY KEY (id),
	CONSTRAINT bp_rule_details_rule_id_key UNIQUE (rule_id),
	CONSTRAINT bp_rule_details_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES base_pricing.bp_rule_master(id) ON DELETE CASCADE
);
CREATE INDEX idx_rule_details_rule ON base_pricing.bp_rule_details USING btree (rule_id);