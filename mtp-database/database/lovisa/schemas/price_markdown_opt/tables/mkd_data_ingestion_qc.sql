--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:mkd_data_ingestion_qc_080725 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for mkd_data_ingestion_qc

CREATE TABLE price_markdown_opt.mkd_data_ingestion_qc (
	table_name varchar(255) NULL,
	check_name varchar(255) NULL,
	count int4 NULL,
	description varchar(255) NULL,
	qc_timestamp timestamp NULL
);