--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_attributes_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_attributes_mapping_1

CREATE TABLE base_pricing_restaurant.bp_product_attributes_mapping_1 (
	product_id int8 NULL,
	image text NULL,
	product_name text NULL,
	"attributes" jsonb NULL,
	updated_at timestamp NULL
);