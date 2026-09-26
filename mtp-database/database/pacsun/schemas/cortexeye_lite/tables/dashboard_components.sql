--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:dashboard_components stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dashboard_components

CREATE TABLE cortexeye_lite.dashboard_components (
	id bigserial NOT NULL,
	filter_id int8 NULL,
	section_id int8 NOT NULL,
	component_type varchar(30) NOT NULL,
	display_order int8 NULL,
	config jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT dashboard_components_pkey PRIMARY KEY (id)
);

ALTER TABLE cortexeye_lite.dashboard_components ADD CONSTRAINT dashboard_components_filter_id_fkey FOREIGN KEY (filter_id) REFERENCES cortexeye_lite.dashboard_filters(id) ON DELETE CASCADE;
ALTER TABLE cortexeye_lite.dashboard_components ADD CONSTRAINT dashboard_components_section_id_fkey FOREIGN KEY (section_id) REFERENCES cortexeye_lite.dashboard_sections(id) ON DELETE CASCADE;