--liquibase formatted sql
--changeset liquibase:tb_rule_store_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_rule_store_groups
CREATE TABLE price_markdown.tb_rule_store_groups (
	rule_id int4 NOT NULL,
	store_group_id int4 NOT NULL,
	CONSTRAINT tb_rule_store_groups_un PRIMARY KEY (rule_id, store_group_id)
);
CREATE INDEX tb_rule_store_groups_rule_id_idx ON price_markdown.tb_rule_store_groups USING btree (rule_id);