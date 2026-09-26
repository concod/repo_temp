--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:bp_ineligible_segments stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_ineligible_segments

CREATE TABLE IF NOT EXISTS base_pricing.bp_ineligible_segments (
	segment_id int4 NOT NULL,
	updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT bp_ineligible_segments_pkey PRIMARY KEY (segment_id, updated_at)
);
