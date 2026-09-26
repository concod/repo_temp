--liquibase formatted sql
--changeset aniket.ashis@impactanalytics.co:store_transfer_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_transfer_material_rule_mapping


CREATE TABLE inventory_smart.store_transfer_material_rule_mapping (
	id serial4 NOT NULL,
	article varchar NOT NULL,
	rule_id int4 NULL,
	transfer_strategy varchar NULL,
	dc_inventory_threshold int4 NULL,
	source_wos_threshold numeric NULL,
	dest_wos_threshold numeric NULL,
	recommend_store_transfer bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	channel varchar NULL,
	CONSTRAINT store_transfer_material_rule_mapping_article_key UNIQUE (article),
	CONSTRAINT store_transfer_material_rule_mapping_pkey PRIMARY KEY (id),
	CONSTRAINT store_transfer_material_rule_mapping_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES inventory_smart.store_transfer_rules(rule_id) ON DELETE SET NULL
);