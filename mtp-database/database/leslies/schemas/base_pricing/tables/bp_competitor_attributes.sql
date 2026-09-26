--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_competitor_attributes_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_competitor_attributes_10

DROP TABLE IF EXISTS base_pricing.bp_competitor_attributes CASCADE;

CREATE TABLE base_pricing.bp_competitor_attributes (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	competitor_id int4 NOT NULL,
	competitor text NULL,
	comp_base_price float8 NULL
);
CREATE INDEX bs_competitor_attributes ON base_pricing.bp_competitor_attributes USING btree (product_id, store_id, competitor_id);