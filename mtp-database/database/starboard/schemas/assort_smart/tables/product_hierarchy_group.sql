
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.product_hierarchy_group_1 stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for product_hierarchy_group

CREATE TABLE IF not exists assort_smart.product_hierarchy_group (
	hierarchy_code varchar NOT NULL,
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp NULL,
	is_custom_hierarchy bool DEFAULT false NULL,
	CONSTRAINT product_hierarchy_group_pk PRIMARY KEY (hierarchy_code),
	CONSTRAINT product_hierarchy_group_un UNIQUE (path, level)
);
CREATE INDEX If Not exists product_hierarchy_group_level_idx ON assort_smart.product_hierarchy_group USING btree (level);