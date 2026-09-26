--liquibase formatted sql
--changeset pavankumar.reddy@impactanalytics.co:product_hierarchies_filter  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_hierarchies_filter

CREATE TABLE "global".product_hierarchies_filter (
	hierarchy_code serial4 NOT NULL,
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp NULL,
	l0_id varchar NULL,
	l1_id varchar NULL,
	l2_id varchar NULL,
	l3_id varchar NULL,
	l4_id varchar NULL,
	article varchar NULL,
	product_code varchar NULL,
	CONSTRAINT product_hierarchies_filter_pk PRIMARY KEY (hierarchy_code),
	CONSTRAINT product_hierarchies_filter_un UNIQUE (path, level)
);
CREATE INDEX product_hierarchies_filter_level_idx ON global.product_hierarchies_filter USING btree (level);