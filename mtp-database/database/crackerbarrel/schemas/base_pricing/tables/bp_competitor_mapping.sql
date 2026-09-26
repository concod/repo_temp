--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_competitor_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_competitor_mapping

CREATE TABLE base_pricing.bp_competitor_mapping (
	product_id int4 NOT NULL,
	s0_cid int4 NOT NULL,
	competitor_id int4 NOT NULL,
	bucket_id int4 NULL
);

CREATE INDEX bp_competitor_mapping_idx ON base_pricing.bp_competitor_mapping USING btree (product_id, s0_cid, competitor_id);