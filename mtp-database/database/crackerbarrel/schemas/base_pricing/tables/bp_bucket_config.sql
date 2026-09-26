--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_bucket_config stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_bucket_config

CREATE TABLE base_pricing.bp_bucket_config (
	bucket_id serial4 NOT NULL,
	bucket_name text NOT NULL,
	bucket_label text NULL,
	is_active bool NOT NULL,
	CONSTRAINT pk_bp_bucket_config PRIMARY KEY (bucket_id)
);

CREATE INDEX bs_bucket_config ON base_pricing.bp_bucket_config USING btree (bucket_id);