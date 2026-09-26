--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:bp_ineligible_stores stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_ineligible_stores

CREATE TABLE IF NOT EXISTS base_pricing.bp_ineligible_stores (
	store_id int4 NOT NULL,
	updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT bp_ineligible_stores_pkey PRIMARY KEY (store_id, updated_at)
);
