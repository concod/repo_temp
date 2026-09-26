--liquibase formatted sql
--changeset liquibase:index_drop_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for index_drop_create
CREATE TABLE global.index_drop_create (
	"table_name" varchar NOT NULL,
	"schema_name" varchar NOT NULL,
	"name" varchar NOT NULL,
	def varchar NOT NULL,
	drop_def varchar NOT NULL,
	"type" varchar NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NULL,
	hit_count int4 NOT NULL DEFAULT 1,
	CONSTRAINT index_drop_create_un UNIQUE (
		"table_name", "schema_name", "name"
	)
);
