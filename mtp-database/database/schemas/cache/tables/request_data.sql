--liquibase formatted sql
--changeset liquibase:request_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for request_data
CREATE TABLE "cache".request_data (
	"key" varchar NOT NULL,
	value jsonb NOT NULL DEFAULT '{}'::jsonb,
	req_code int4 NOT NULL,
	download_count int4 NOT NULL DEFAULT 0,
	CONSTRAINT request_data_pk PRIMARY KEY (key),
	CONSTRAINT request_data_fk FOREIGN KEY (req_code) REFERENCES "cache".request_tracker(req_code) ON DELETE CASCADE
);
CREATE INDEX request_data_req_code_idx ON cache.request_data USING btree (req_code);
