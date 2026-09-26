--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_sql_query_store stripComments:false splitStatements:false context:Release_1_0 labels:tb_sql_query_store1
--comment: initial changeset for tb_sql_query_store
CREATE TABLE datamodel.tb_sql_query_store (
	id serial4 NOT NULL,
	query_name varchar(50) NOT NULL,
	query_text text NULL,
	table_name varchar(50) NULL,
	selected_columns text NULL,
	"condition" text NULL,
	is_parameterized bool NULL,
	remarks text NULL,
	last_modified time NULL,
	CONSTRAINT tb_sql_query_store_id_key UNIQUE (id),
	CONSTRAINT tb_sql_query_store_pkey PRIMARY KEY (query_name)
);