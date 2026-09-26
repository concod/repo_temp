--liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:tb_copy_jobs stripComments:false splitStatements:false context:add_copy_jobs_table    labels:add_copy_jobs_table
--comment: Add copy jobs table


CREATE TABLE size_smart.tb_copy_jobs (
	id bigserial NOT NULL,
	session_table_name text NOT NULL,
	status text DEFAULT 'pending'::text NOT NULL,
	params jsonb NOT NULL,
	user_code int4 NULL,
	rows_copied int8 DEFAULT 0 NULL,
	error_message text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	started_at timestamptz NULL,
	completed_at timestamptz NULL,
	expires_at timestamptz DEFAULT now() + '02:00:00'::interval NOT NULL,
	CONSTRAINT tb_copy_jobs_pkey PRIMARY KEY (id),
	CONSTRAINT tb_copy_jobs_session_table_name_key UNIQUE (session_table_name)
);
CREATE INDEX idx_copy_jobs_status_created ON size_smart.tb_copy_jobs (status,created_at);


-- changeset akashkumar.rana@impactanalytics.co:tb_copy_jobs_modifications_01 stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS-01 
-- comment: initial changeset for tb_copy_jobs_modifications_01
ALTER TABLE size_smart.tb_copy_jobs
ADD COLUMN size_profile_id INT;

ALTER TABLE size_smart.tb_copy_jobs
ADD CONSTRAINT tb_copy_jobs_size_profile_id_key UNIQUE (size_profile_id);