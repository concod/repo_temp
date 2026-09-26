--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:rcl_psa_config_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for rcl_psa_config_table

CREATE TABLE if not exists inventory_smart.rcl_psa_config_table (
	id serial4 NOT NULL,
	l0_name varchar NOT NULL,
	psa_name varchar NULL,
	psa_code varchar NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	l1_name varchar NOT NULL,
	sub_psa_code varchar NULL,
	CONSTRAINT psa_config_table_pk PRIMARY KEY (l0_name, l1_name, psa_code)
);

--changeset gauri.nair@impactanalytics.co:rcl_psa_config_table_alter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1
--comment: alter table changeset for rcl_psa_config_table
alter table inventory_smart.rcl_psa_config_table add column if not exists l2_name varchar NULL,
	add column if not exists l3_name varchar NULL,
	add column if not exists store_category varchar NULL,
	add column if not exists geo_region varchar NULL,
	add column if not exists store_tier varchar NULL;

--changeset gauri.nair@impactanalytics.co:rcl_psa_config_table_alter_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1_v2
--comment: alter table changeset for rcl_psa_config_table_v2
ALTER TABLE inventory_smart.rcl_psa_config_table 
RENAME COLUMN l0_name TO department;

ALTER TABLE inventory_smart.rcl_psa_config_table 
RENAME COLUMN l1_name TO subdepartment;

ALTER TABLE inventory_smart.rcl_psa_config_table 
RENAME COLUMN l2_name TO "class";

ALTER TABLE inventory_smart.rcl_psa_config_table 
RENAME COLUMN l3_name TO subclass;

--changeset gauri.nair@impactanalytics.co:rcl_psa_config_table_alter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1_v3
--comment: alter table changeset for rcl_psa_config_table_v3
ALTER TABLE inventory_smart.rcl_psa_config_table 
RENAME COLUMN department TO l0_name;

ALTER TABLE inventory_smart.rcl_psa_config_table 
RENAME COLUMN subdepartment TO l1_name;

--changeset anish.a@impactanalytics.co:rcl_psa_config_table_alter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1_v4
--comment: alter table changeset for rcl_psa_config_table_v4
alter table inventory_smart.rcl_psa_config_table drop column if exists "class",
	drop column if exists subclass;
