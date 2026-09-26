--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_bulk_update_batch_status stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_bulk_update_batch_status

CREATE TABLE base_pricing.bp_bulk_update_batch_status (
	id serial4 NOT NULL,
	job_id uuid NOT NULL,
	table_name varchar(100) NOT NULL,
	status varchar(50) DEFAULT 'pending'::character varying NOT NULL,
	batch_number int4 NOT NULL,
	batch_size int4 DEFAULT 0 NOT NULL,
	updated_records int4 DEFAULT 0 NOT NULL,
	table_rows_updated int8 DEFAULT 0 NOT NULL,
	not_found_records int4 DEFAULT 0 NOT NULL,
	failed_records int4 DEFAULT 0 NOT NULL,
	retry_count int4 DEFAULT 0 NOT NULL,
	max_retries int4 DEFAULT 3 NOT NULL,
	error_message text NULL,
	failed_records_details jsonb DEFAULT '[]'::jsonb NULL,
	not_found_records_details jsonb DEFAULT '[]'::jsonb NULL,
	started_at timestamptz NULL,
	completed_at timestamptz NULL,
	processing_time varchar(20) NULL,
	CONSTRAINT bp_bulk_update_batch_status_job_id_table_name_batch_number_key UNIQUE (job_id, table_name, batch_number),
	CONSTRAINT bp_bulk_update_batch_status_pkey PRIMARY KEY (id),
	CONSTRAINT chk_bulk_update_batch_records CHECK (((((updated_records + not_found_records) + failed_records) <= batch_size) AND (updated_records >= 0) AND (not_found_records >= 0) AND (failed_records >= 0))),
	CONSTRAINT chk_bulk_update_batch_retries CHECK ((retry_count <= max_retries)),
	CONSTRAINT chk_bulk_update_batch_size CHECK ((batch_size >= 0)),
	CONSTRAINT chk_bulk_update_batch_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('completed_with_errors'::character varying)::text, ('failed'::character varying)::text, ('cancelled'::character varying)::text, ('retrying'::character varying)::text]))),
	CONSTRAINT bp_bulk_update_batch_status_job_id_fkey FOREIGN KEY (job_id) REFERENCES base_pricing.bp_bulk_update_job_status(job_id) ON DELETE CASCADE,
	CONSTRAINT bp_bulk_update_batch_status_job_id_table_name_fkey FOREIGN KEY (job_id,table_name) REFERENCES base_pricing.bp_bulk_update_table_status(job_id,table_name) ON DELETE CASCADE
);
CREATE INDEX idx_bp_bulk_update_batch_status_batch_number ON base_pricing.bp_bulk_update_batch_status USING btree (batch_number);
CREATE INDEX idx_bp_bulk_update_batch_status_job_table ON base_pricing.bp_bulk_update_batch_status USING btree (job_id, table_name);
CREATE INDEX idx_bp_bulk_update_batch_status_started_at ON base_pricing.bp_bulk_update_batch_status USING btree (started_at);
CREATE INDEX idx_bp_bulk_update_batch_status_status ON base_pricing.bp_bulk_update_batch_status USING btree (status);