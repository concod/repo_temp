--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_bucket_details stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_price_bucket_details

CREATE TABLE base_pricing.bp_price_bucket_details (
	id int4 NULL,
	direction varchar(20) NULL,
	min_range float8 NULL,
	max_range float8 NULL,
	category varchar NULL
);

CREATE INDEX idx_pbd_direction ON base_pricing.bp_price_bucket_details USING btree (direction);