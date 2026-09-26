--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_bucket_config_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_bucket_config_v1

CREATE TABLE base_pricing.bp_bucket_config (
	bucket_id serial4 NOT NULL,
	bucket_name text NULL,
	bucket_label text NULL
);
CREATE INDEX bs_bucket_config ON base_pricing.bp_bucket_config USING btree (bucket_id);