--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_competitor_attributes stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_competitor_attributes

CREATE TABLE base_pricing.bp_competitor_attributes (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	competitor_id int4 NOT NULL,
	competitor text NULL,
	comp_base_price float8 NULL,
	CONSTRAINT pk_bp_competitor_attributes PRIMARY KEY (product_id, store_id, competitor_id)
);

CREATE INDEX idx_bp_competitor_attributes_competitor_id ON base_pricing.bp_competitor_attributes USING btree (competitor_id);