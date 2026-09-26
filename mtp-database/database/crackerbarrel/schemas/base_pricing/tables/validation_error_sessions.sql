--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:validation_error_sessions stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.validation_error_sessions

CREATE TABLE base_pricing.validation_error_sessions (
	session_id varchar(255) NOT NULL,
	user_id varchar(255) NOT NULL,
	screen_name varchar(255) NOT NULL,
	original_filename varchar(255) NOT NULL,
	total_rows int4 NOT NULL,
	error_count int4 DEFAULT 0 NOT NULL,
	report_url varchar(500) NULL,
	status varchar(50) DEFAULT 'processing'::character varying NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT validation_error_sessions_pkey PRIMARY KEY (session_id)
);

CREATE INDEX idx_validation_error_session_user_screen ON base_pricing.validation_error_sessions USING btree (session_id, user_id, screen_name);