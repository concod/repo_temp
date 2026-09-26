--liquibase formatted sql
--changeset shubham.singh:set_all_count stripComments:false splitStatements:false context:Release_1_0 labels:MTP-28858
--comment: table for storing details of set_all_count changes
CREATE TABLE "global".set_all_details (
	job_id bigserial NOT NULL,
	screen_name text NOT NULL,
	updated_by varchar NOT NULL,
	count bigint NOT NULL,
	updated_at date NOT NULL,
	payload jsonb NOT NULL,
	CONSTRAINT set_all_details_pk PRIMARY KEY (job_id)
);
ALTER TABLE "global".set_all_details ADD updated bool NULL;

--changeset shubham.singh@impactanalytics.co:set_all_count stripComments:false splitStatements:false context:Release_1_1 labels:MTP-29966
--comment: added a new column and renamed a column

ALTER TABLE "global".set_all_details ADD sku_count int8 NULL;
ALTER TABLE "global".set_all_details RENAME COLUMN count TO record_count;