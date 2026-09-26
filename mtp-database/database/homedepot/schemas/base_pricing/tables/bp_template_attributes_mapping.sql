
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_template_attributes_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_template_attributes_mapping_v2

CREATE TABLE base_pricing.bp_template_attributes_mapping (
	mapping_id int2 NOT NULL,
	template_id int4 NOT NULL,
	attribute_id int4 NOT NULL,
	pinned_side varchar(5) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_template_attributes_mapping_pkey PRIMARY KEY (mapping_id),
	CONSTRAINT chk_pinned_status CHECK (((pinned_side)::text = ANY ((ARRAY['left'::character varying, 'right'::character varying])::text[]))),
	CONSTRAINT unique_template_attribute UNIQUE (template_id, attribute_id),
	CONSTRAINT bp_template_attributes_mapping_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES base_pricing.bp_reporting_attributes_metadata(attribute_id) ON DELETE CASCADE,
	CONSTRAINT bp_template_attributes_mapping_template_id_fkey FOREIGN KEY (template_id) REFERENCES base_pricing.bp_templates_metadata(template_id) ON DELETE CASCADE
);