--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_template_attributes_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_template_attributes_mapping

CREATE TABLE base_pricing_restaurant.bp_template_attributes_mapping (
	mapping_id int2 NOT NULL,
	template_id int4 NOT NULL,
	attribute_id int4 NOT NULL,
	pinned_side varchar(5) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	column6 varchar(50) NULL,
	column7 int4 NULL,
	CONSTRAINT bp_template_attributes_mapping_pkey PRIMARY KEY (mapping_id),
	CONSTRAINT chk_pinned_status CHECK (((pinned_side IS NULL) OR ((pinned_side)::text = ''::text) OR ((pinned_side)::text = ANY (ARRAY[('left'::character varying)::text, ('right'::character varying)::text])))),
	CONSTRAINT unique_template_attribute UNIQUE (template_id, attribute_id),
	CONSTRAINT bp_template_attributes_mapping_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES base_pricing_restaurant.bp_reporting_attributes_metadata(attribute_id) ON DELETE CASCADE,
	CONSTRAINT bp_template_attributes_mapping_template_id_fkey FOREIGN KEY (template_id) REFERENCES base_pricing_restaurant.bp_templates_metadata(template_id) ON DELETE CASCADE
);