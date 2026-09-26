--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_competitor_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_competitor_mapping_v1

CREATE TABLE base_pricing.bp_competitor_mapping (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	competitor_id int4 NOT NULL,
	bucket_id int4 NULL
);
CREATE INDEX bs_competitor_mapping ON base_pricing.bp_competitor_mapping USING btree (product_id, store_id, competitor_id);