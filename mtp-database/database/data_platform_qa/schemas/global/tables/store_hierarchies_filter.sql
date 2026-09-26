--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:store_hierarchies_filter_1 stripComments:false splitStatements:false context:MTP-67427 labels:MTP-67427
--comment: initial changeset for store_hierarchies_filter
CREATE TABLE "global".store_hierarchies_filter (
	hierarchy_code serial4 NOT NULL,
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp NULL,
	CONSTRAINT store_hierarchies_filter_pk PRIMARY KEY (hierarchy_code),
	CONSTRAINT store_hierarchies_filter_un UNIQUE (path, level)
);