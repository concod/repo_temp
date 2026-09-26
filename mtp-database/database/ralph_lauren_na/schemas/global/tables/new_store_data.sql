--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:new_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping
CREATE TABLE IF NOT EXISTS  "global".new_store_data (
	store_code varchar NULL,
	store_name varchar NULL,
	instore_date date NULL,
	allocation_start_date date NULL,
	is_store_created int2 DEFAULT 0 NULL,
	store_groups _varchar NULL,
	created_at timestamptz NULL,
	created_by int4 NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL
);

--changeset anujkumar.singh@impactanalytics.co:new_store_data_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding constraints
ALTER TABLE "global".new_store_data ADD CONSTRAINT new_store_data_pk PRIMARY KEY (store_code);