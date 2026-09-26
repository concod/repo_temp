--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_competitor_attributes_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_competitor_attributes_v2

CREATE TABLE base_pricing.bp_competitor_attributes (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	competitor_id int4 NOT NULL,
	competitor text NULL,
	comp_base_price float8 NULL
);
CREATE INDEX bs_competitor_attributes ON base_pricing.bp_competitor_attributes USING btree (product_id, store_id, competitor_id);