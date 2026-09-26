--liquibase formatted sql
--changeset shubhrant.yadav@impactanalytics.co:gbq_update_logs_table1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for gbq_update_logs_table1


CREATE TABLE IF NOT EXISTS "cache".gbq_update_logs (
	query_id serial4 NOT NULL,
	table_name varchar(100) NOT NULL,
	update_query text NOT NULL,
	status varchar(20) NOT NULL,
	created_at timestamp NULL,
	processed_at timestamp NULL,
	completed_at timestamp NULL,
	transaction_id varchar(100) NOT NULL,
	rows_updated int4 NULL,
	created_by varchar(100) NULL,
	failure_cause varchar NULL,
	retry_attempts int4 NULL,
	CONSTRAINT gbq_update_logs_pk PRIMARY KEY (query_id)
);

--changeset mtp.cache:gbq_update_logs_is_deleted_last_updated stripComments:false splitStatements:false context:Release_1_0 labels:mtp
--comment: add is_deleted and last_updated to cache.gbq_update_logs for existing deployments
ALTER TABLE "cache".gbq_update_logs ADD COLUMN IF NOT EXISTS is_deleted bool DEFAULT false NULL;
ALTER TABLE "cache".gbq_update_logs ADD COLUMN IF NOT EXISTS last_updated timestamp NULL;

--changeset mtp.cache:gbq_update_logs_widen_varchar_columns stripComments:false splitStatements:false context:Release_1_0 labels:mtp
--comment: align table_name and transaction_id to varchar(100) for databases created from legacy client-specific scripts (no-op if already varchar(100))
ALTER TABLE "cache".gbq_update_logs ALTER COLUMN table_name TYPE varchar(100) USING table_name::varchar;
ALTER TABLE "cache".gbq_update_logs ALTER COLUMN transaction_id TYPE varchar(100) USING transaction_id::varchar;

