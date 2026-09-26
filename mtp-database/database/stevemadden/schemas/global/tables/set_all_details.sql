--liquibase formatted sql
--changeset liquibase:set_all_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for set_all_details MTP-38151
-- "global".set_all_details definition

-- Drop table

-- DROP TABLE "global".set_all_details;

CREATE TABLE "global".set_all_details (
	job_id bigserial NOT NULL,
	screen_name text NOT NULL,
	updated_by varchar NOT NULL,
	record_count int8 NOT NULL,
	updated_at timestamptz NULL,
	payload jsonb NOT NULL,
	updated bool NULL,
	sku_count int8 NULL,
	CONSTRAINT set_all_details_pk PRIMARY KEY (job_id)
);
