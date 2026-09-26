--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_bulk_update_table_status stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_bulk_update_table_status

CREATE TABLE base_pricing_restaurant.bp_bulk_update_table_status (
	id serial4 NOT NULL,
	job_id uuid NOT NULL,
	table_name varchar(100) NOT NULL,
	status varchar(50) DEFAULT 'pending'::character varying NOT NULL,
	total_batches int4 DEFAULT 0 NOT NULL,
	completed_batches int4 DEFAULT 0 NOT NULL,
	failed_batches int4 DEFAULT 0 NOT NULL,
	total_records int4 DEFAULT 0 NOT NULL,
	updated_records int4 DEFAULT 0 NOT NULL,
	not_found_records int4 DEFAULT 0 NOT NULL,
	failed_records int4 DEFAULT 0 NOT NULL,
	started_at timestamptz NULL,
	completed_at timestamptz NULL,
	processing_time varchar(20) NULL,
	table_metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT bp_bulk_update_table_status_job_id_table_name_key UNIQUE (job_id, table_name),
	CONSTRAINT bp_bulk_update_table_status_pkey PRIMARY KEY (id),
	CONSTRAINT chk_bulk_update_table_batches CHECK (((completed_batches <= total_batches) AND (failed_batches <= total_batches))),
	CONSTRAINT chk_bulk_update_table_records CHECK (((((updated_records + not_found_records) + failed_records) <= total_records) AND (updated_records >= 0) AND (not_found_records >= 0) AND (failed_records >= 0))),
	CONSTRAINT chk_bulk_update_table_status CHECK (((status)::text = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'completed_with_errors'::text, 'failed'::text, 'cancelled'::text, 'data_ready'::text]))),
	CONSTRAINT bp_bulk_update_table_status_job_id_fkey FOREIGN KEY (job_id) REFERENCES base_pricing_restaurant.bp_bulk_update_job_status(job_id) ON DELETE CASCADE
);
CREATE INDEX idx_bp_bulk_update_table_status_job_id ON base_pricing_restaurant.bp_bulk_update_table_status USING btree (job_id);
CREATE INDEX idx_bp_bulk_update_table_status_started_at ON base_pricing_restaurant.bp_bulk_update_table_status USING btree (started_at);
CREATE INDEX idx_bp_bulk_update_table_status_status ON base_pricing_restaurant.bp_bulk_update_table_status USING btree (status);
CREATE INDEX idx_bp_bulk_update_table_status_table_name ON base_pricing_restaurant.bp_bulk_update_table_status USING btree (table_name);