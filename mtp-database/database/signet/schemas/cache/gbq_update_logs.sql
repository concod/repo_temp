CREATE TABLE if not exists "cache".gbq_update_logs (
	query_id serial4 NOT NULL,
	table_name varchar(20) NOT NULL,
	update_query text NOT NULL,
	status varchar(20) NOT NULL,
	created_at timestamp NULL,
	processed_at timestamp NULL,
	completed_at timestamp NULL,
	transaction_id varchar(50) NOT NULL,
	rows_updated int4 NULL,
	created_by varchar(100) NULL,
	failure_cause varchar NULL,
	retry_attempts int4 null,
	CONSTRAINT gbq_update_logs_pk PRIMARY KEY (query_id)
);

--changeset signet.cache:gbq_update_logs_legacy_dir_is_deleted_last_updated stripComments:false splitStatements:false context:Release_1_0 labels:signet
--comment: add is_deleted and last_updated to cache.gbq_update_logs for existing deployments
ALTER TABLE "cache".gbq_update_logs ADD COLUMN IF NOT EXISTS is_deleted bool DEFAULT false NULL;
ALTER TABLE "cache".gbq_update_logs ADD COLUMN IF NOT EXISTS last_updated timestamp NULL;
