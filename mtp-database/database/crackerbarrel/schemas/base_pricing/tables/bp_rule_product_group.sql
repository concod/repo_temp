--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_rule_product_group stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_rule_product_group

CREATE TABLE base_pricing.bp_rule_product_group (
	rule_id int4 NOT NULL,
	product_group_id int4 NOT NULL,
	CONSTRAINT uq_rule_product_group UNIQUE (rule_id, product_group_id)
);

CREATE INDEX idx_bp_rule_product_group_product_group_id ON base_pricing.bp_rule_product_group USING btree (product_group_id);
CREATE INDEX idx_bp_rule_product_group_rule_id ON base_pricing.bp_rule_product_group USING btree (rule_id);