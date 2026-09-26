--liquibase formatted sql
--changeset liquibase:rcl_psa_config_table_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: intial changeset for rcl_psa_config_table
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_psa_config_table (
	id serial4 NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l0_id varchar NULL,
	l1_id varchar NULL,
	q_str_grade varchar NULL,
	volume_cd varchar NULL,
	store_concept varchar NULL,
	psa_code varchar NOT NULL,
	sub_psa_code varchar NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT psa_config_table_pk PRIMARY KEY (l0_name, l1_name, psa_code)
);
