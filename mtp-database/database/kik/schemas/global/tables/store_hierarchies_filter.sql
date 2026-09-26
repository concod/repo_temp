--liquibase formatted sql
--changeset pavankumar.reddy@impactanalytics.co:store_hierarchies_filter  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_hierarchies_filter

CREATE TABLE "global".store_hierarchies_filter (
	hierarchy_code serial4 NOT NULL,
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp NULL,
	s0_id varchar NULL,
	s1_id varchar NULL,
	CONSTRAINT store_hierarchies_filter_pk PRIMARY KEY (hierarchy_code),
	CONSTRAINT store_hierarchies_filter_un UNIQUE (path, level)
);