--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:dashboard_filters stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dashboard_filters

CREATE TABLE cortexeye_lite.dashboard_filters (
	id bigserial NOT NULL,
	filters jsonb NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT dashboard_filters_pkey PRIMARY KEY (id)
);