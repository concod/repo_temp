-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:allocation_response_logs stripComments:false splitStatements:false context: db_sync labels:allocation_response_logs
-- comment: initial changeset for allocation_response_logs

CREATE TABLE inventory_smart.allocation_response_logs (
	allocation_code varchar NOT NULL,
	created_at timestamptz NOT NULL,
	created_by varchar NOT NULL,
	response jsonb NOT NULL
);