--liquibase formatted sql
--changeset liquibase:dc_transfer_rule_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_transfer_rule and changed schema

DROP table if exists inventory_smart.dc_transfer_material_rule_mapping;
CREATE TABLE inventory_smart.dc_transfer_material_rule_mapping (
	id serial4 NOT NULL,
	article varchar NULL,
	rule_id int4 NULL,
	dc_target_wos int4 NULL,
	recommend_dc_transfer bool NOT NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	CONSTRAINT dc_transfer_material_rule_mapping_pk PRIMARY KEY (id)
);