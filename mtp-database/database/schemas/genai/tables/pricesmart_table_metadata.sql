--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:pricesmart_table_metadata_3 stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: initial changeset for acl_master

CREATE TABLE IF NOT exists genai.pricesmart_table_metadata (
	id serial4 not null,
	table_name varchar(255) NOT NULL,
	database_type varchar(255) not null,
	table_description varchar(255),
	table_schema jsonb,
	redis_index_name varchar,
	module_name varchar(255) not null,
	application_name varchar(255),
	tenant varchar(255),
	status bool default true,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT pricesmart_table_metadata_pk PRIMARY KEY (table_name)
);

--changeset shannonnelson.d@impactanalytics.co:pricesmart_table_metadata_1 stripComments:false splitStatements:false context:Release_2_1 labels:pricesmart_table_metadata_1
--comment: added audit columns (created_by, updated_by) and added deefault value
ALTER TABLE genai.pricesmart_table_metadata
ADD COLUMN IF NOT EXISTS created_by int4 NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_by int4 NULL;
