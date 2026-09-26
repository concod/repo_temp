--liquibase formatted sql
--changeset liquibase:sp_logs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sp_logs
CREATE TABLE IF NOT EXISTS global.sp_logs (
	id varchar NOT NULL,
	sp_name varchar NOT NULL,
	context varchar NOT NULL,
	query text NULL,
	params jsonb NULL,
	clock_timestamp timestamptz NOT NULL
);
