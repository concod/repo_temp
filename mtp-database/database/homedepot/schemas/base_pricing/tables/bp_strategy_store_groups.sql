
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_store_groups_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_store_groups_v2

CREATE TABLE base_pricing.bp_strategy_store_groups (
	strategy_id int4 NOT NULL,
	store_group_id int4 NOT NULL,
	CONSTRAINT unique_strategy_store_group UNIQUE (strategy_id, store_group_id)
);
CREATE INDEX idx_bp_strategy_store_groups_store_group_id ON base_pricing.bp_strategy_store_groups USING btree (store_group_id);
CREATE INDEX idx_bp_strategy_store_groups_strategy_id ON base_pricing.bp_strategy_store_groups USING btree (strategy_id);