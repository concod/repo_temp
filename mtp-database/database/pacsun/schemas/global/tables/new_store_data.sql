--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:new_store_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_data

CREATE TABLE IF NOT EXISTS "global".new_store_data(
	store_code varchar NULL,
	store_name varchar NULL
);


ALTER TABLE "global".new_store_data ADD CONSTRAINT uk_new_store_data_store_code UNIQUE (store_code);
ALTER TABLE "global".new_store_data ADD CONSTRAINT new_store_data_pkey PRIMARY KEY (store_code);
