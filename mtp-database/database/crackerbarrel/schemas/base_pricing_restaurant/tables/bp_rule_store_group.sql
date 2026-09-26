--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_rule_store_group stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_rule_store_group

CREATE TABLE base_pricing_restaurant.bp_rule_store_group (
	rule_id int4 NOT NULL,
	store_group_id int4 NOT NULL,
	CONSTRAINT uq_rule_store_group UNIQUE (rule_id, store_group_id),
	CONSTRAINT fk_rule_store_group_rule_id FOREIGN KEY (rule_id) REFERENCES base_pricing_restaurant.bp_rule_master(id) ON DELETE CASCADE,
	CONSTRAINT fk_rule_store_group_store_group_id FOREIGN KEY (store_group_id) REFERENCES base_pricing_restaurant.bp_store_group(store_group_id) ON DELETE CASCADE
);
CREATE INDEX idx_bp_rule_store_group_rule_id ON base_pricing_restaurant.bp_rule_store_group USING btree (rule_id);
CREATE INDEX idx_bp_rule_store_group_store_group_id ON base_pricing_restaurant.bp_rule_store_group USING btree (store_group_id);