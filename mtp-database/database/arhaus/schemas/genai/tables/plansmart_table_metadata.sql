--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:plansmart_table_metadata_3  stripComments:false splitStatements:false context:Release_1_3 labels:MTP-73057
--comment: initial changeset for plansmart_table_metadata 


CREATE TABLE IF NOT exists genai.plansmart_table_metadata (
	id serial4 NOT NULL,
	table_name varchar(255) NOT NULL,
	database_type varchar(255) NOT NULL,
	table_description varchar(255) NULL,
	table_schema jsonb NULL,
	redis_index_name varchar NULL,
	module_name varchar(255) NOT NULL,
	application_name varchar(255) NULL,
	tenant varchar(255) NULL,
	status bool DEFAULT true NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT plansmart_table_metadata_pk PRIMARY KEY (table_name)
);