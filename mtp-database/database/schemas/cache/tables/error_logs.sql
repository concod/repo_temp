--liquibase formatted sql
--changeset liquibase:error_logs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for error_logs
CREATE TABLE "cache".error_logs (
	log_id serial4 NOT NULL,
	sp_name varchar NULL,
	created_at timestamp NULL DEFAULT now(),
	created_by varchar NULL,
	message varchar NULL,
	n1 int4 NULL,
	r1 varchar NULL
);

--changeset tarunreddy.challa:error_logs_updated stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added now() for column created at
ALTER TABLE "cache".error_logs ALTER COLUMN created_at SET DEFAULT now();