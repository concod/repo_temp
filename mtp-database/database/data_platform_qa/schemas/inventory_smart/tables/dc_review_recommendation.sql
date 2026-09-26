--liquibase formatted sql
--changeset liquibase:dc_review_recommendation stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: initial changeset for dc_review_recommendation
CREATE TABLE inventory_smart.dc_review_recommendation (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	source_dc int4 NOT NULL,
	destination_dc int4 NOT NULL,
	excess_units int4 NULL,
	deficit_units int4 NULL,
	ia_reco_transfer int4 NULL,
	source_dc_demand_projection float8 NULL,
	destination_dc_demand_projection float8 NULL
);


--changeset kamuju.mahaveer:dc_review_recommendation_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated schema for dc_review_recommendation
ALTER TABLE inventory_smart.dc_review_recommendation ADD COLUMN IF NOT EXISTS recommendation_flag int4 NULL;
ALTER TABLE inventory_smart.dc_review_recommendation ADD CONSTRAINT dc_review_recommendation_unique UNIQUE (product_code, source_dc, destination_dc);
ALTER TABLE inventory_smart.dc_review_recommendation ADD CONSTRAINT dc_review_recommendation_source_dc FOREIGN KEY (source_dc) REFERENCES global.distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_review_recommendation ADD CONSTRAINT dc_review_recommendation_product_code FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_review_recommendation ADD CONSTRAINT dc_review_recommendation_destination_dc FOREIGN KEY (destination_dc) REFERENCES global.distribution_centres(dc_code) ON DELETE CASCADE;

