--liquibase formatted sql
--changeset liquibase:tb_db_migration_files stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_db_migration_files
CREATE TABLE price_markdown.tb_db_migration_files (
	id serial4 NOT NULL,
	sheet_name varchar NOT NULL,
	CONSTRAINT tb_db_migration_files_pkey PRIMARY KEY (sheet_name)
);