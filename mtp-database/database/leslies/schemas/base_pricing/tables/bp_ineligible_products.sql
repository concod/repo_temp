--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:bp_ineligible_products stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_ineligible_products

CREATE TABLE IF NOT EXISTS base_pricing.bp_ineligible_products (
	product_id int4 NOT NULL,
	updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT bp_ineligible_products_pkey PRIMARY KEY (product_id, updated_at)
);
