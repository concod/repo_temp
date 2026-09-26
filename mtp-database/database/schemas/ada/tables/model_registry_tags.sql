--liquibase formatted sql
--changeset liquibase:model_registry_tags stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for model_registry_tags
CREATE TABLE "ada".model_registry_tags (
	tag_id serial4 NOT NULL,
	tag jsonb NOT NULL,
	CONSTRAINT model_registry_tags_pkey PRIMARY KEY (tag_id)
);
CREATE UNIQUE INDEX model_registry_tag ON ada.model_registry_tags USING btree (tag);
