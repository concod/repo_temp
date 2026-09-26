--liquibase formatted sql
--changeset rohan.santhosh@impactanalytics.co:store_attributes_filter_dg_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter_v1

CREATE TABLE "global".store_attributes_filter (
	store_code varchar NOT NULL,
	store_name varchar NOT NULL,
	store_description text NULL,
	active bool NOT NULL,
	special_classification varchar NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	dc_code int4 NULL,
	fc_code int4 NULL,
	is_deleted bool NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
	CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset rohan.santhosh@impactanalytics.co:store_attributes_filter_dg_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added columns in SAF table
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS updated_date	date NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS s1_name	varchar NOT NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS s2_name	varchar NOT NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_status	bool NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_open_date	date NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_close_date	date NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS longitude	float8 NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS latitude	float8 NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS country	varchar NOT NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS s3_name	varchar NOT NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS city	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS state	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS zip_code	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS location_type	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS climate	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_selling_area	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_tier	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS comp_status	bool NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS existing_space_status_description	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_classification	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS s0_name	varchar NOT NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS channel	varchar NOT NULL;

--changeset rohan.santhosh@impactanalytics.co:store_attributes_filter_dg_v4 stripComments:false splitStatements:false context:Release_1_0_v4 labels:liquibase_project_start_v4
--comment: edited two columns in SAF table
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS store_cluster	varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS sister_location_id	varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:store_attributes_filter_dg_v6 stripComments:false splitStatements:false context:Release_1_0_v6 labels:liquibase_project_start_v6
--comment: updated column in SAF table
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS country_channel varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:store_attributes_filter_dg_v7 stripComments:false splitStatements:false context:Release_1_0_v7 labels:liquibase_project_start_v7
--comment: Removing not null constraint from SAF table
ALTER TABLE "global".store_attributes_filter ALTER COLUMN s1_name DROP NOT NULL; 
ALTER TABLE "global".store_attributes_filter ALTER COLUMN s2_name DROP NOT NULL; 
ALTER TABLE "global".store_attributes_filter ALTER COLUMN country DROP NOT NULL; 
ALTER TABLE "global".store_attributes_filter ALTER COLUMN s3_name DROP NOT NULL; 
ALTER TABLE "global".store_attributes_filter ALTER COLUMN s0_name DROP NOT NULL; 
ALTER TABLE "global".store_attributes_filter ALTER COLUMN channel DROP NOT NULL; 