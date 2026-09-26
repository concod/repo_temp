--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_bulk_update_job_status stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_bulk_update_job_status


CREATE TABLE base_pricing_restaurant.bp_bulk_update_job_status (
	job_id uuid NOT NULL,
	user_id int4 NOT NULL,
	screen varchar(100) NOT NULL,
	status varchar(50) DEFAULT 'pending'::character varying NOT NULL,
	started_at timestamptz NULL,
	completed_at timestamptz NULL,
	processing_time varchar(20) NULL,
	CONSTRAINT bp_bulk_update_job_status_pkey PRIMARY KEY (job_id),
	CONSTRAINT chk_bulk_update_job_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('completed_with_errors'::character varying)::text, ('failed'::character varying)::text, ('cancelled'::character varying)::text])))
);
CREATE INDEX idx_bp_bulk_update_job_status_completed_at ON base_pricing_restaurant.bp_bulk_update_job_status USING btree (completed_at);
CREATE INDEX idx_bp_bulk_update_job_status_started_at ON base_pricing_restaurant.bp_bulk_update_job_status USING btree (started_at);
CREATE INDEX idx_bp_bulk_update_job_status_status ON base_pricing_restaurant.bp_bulk_update_job_status USING btree (status);
CREATE INDEX idx_bp_bulk_update_job_status_user_id ON base_pricing_restaurant.bp_bulk_update_job_status USING btree (user_id);