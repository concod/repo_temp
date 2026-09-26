--liquibase formatted sql
--changeset liquibase:model_registry stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for model_registry
CREATE TABLE "ada".model_registry (
	model_code int4 NULL,
	tag_id int4 NOT NULL,
	training_sub_category varchar NOT NULL,
	code varchar NOT NULL,
	"version" int4 NOT NULL,
	training_category varchar NOT NULL,
	model_url varchar NOT NULL,
	lower_level_split_model_url varchar NULL,
	hierarchy_level varchar NULL,
	similarity_flag bool NULL,
	data_refresh_date date NULL,
	experiment_id varchar NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deleted bool NULL DEFAULT false,
	is_latest bool NOT NULL,
	CONSTRAINT model_registry_pkey PRIMARY KEY (tag_id, training_sub_category, code, version)
);
CREATE INDEX inx_model_registry_latest ON ada.model_registry USING btree (is_latest);
