--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:validation_error_results_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.validation_error_results_10

CREATE TABLE base_pricing.validation_error_results (
	session_id varchar(255) NOT NULL,
	"row_number" int4 NOT NULL,
	row_data jsonb NOT NULL,
	errors text NULL,
	is_valid bool DEFAULT true NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT validation_error_results_pkey PRIMARY KEY (session_id, row_number),
	CONSTRAINT validation_error_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES base_pricing.validation_error_sessions(session_id) ON DELETE CASCADE
);
CREATE INDEX idx_validation_results_session ON base_pricing.validation_error_results USING btree (session_id);