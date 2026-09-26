--liquibase formatted sql
--changeset liquibase:allocation_filters stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_filters
CREATE TABLE source_smart.allocation_filters (
	filter_id uuid NOT NULL,
	filter_name text NULL,
	description text NULL,
	categories jsonb NULL,
	last_updated timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	last_updated_by text NULL,
	status text NULL,
	facility_group_id varchar(255) NULL,
	facility_group_name varchar(255) NULL,
	CONSTRAINT allocation_filters_pkey PRIMARY KEY (filter_id)
);