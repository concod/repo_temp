--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_ineligible_stores_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_ineligible_stores_1

CREATE TABLE base_pricing_restaurant.bp_ineligible_stores (
	store_id int4 NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_ineligible_stores_pkey PRIMARY KEY (store_id, updated_at)
);
