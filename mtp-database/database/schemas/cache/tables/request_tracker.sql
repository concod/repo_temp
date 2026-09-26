--liquibase formatted sql
--changeset liquibase:request_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for request_tracker
CREATE TABLE "cache".request_tracker (
	req_code serial4 NOT NULL,
	payload jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT request_tracker_pk PRIMARY KEY (req_code)
);
CREATE INDEX request_tracker_idx ON cache.request_tracker USING hash (payload);
