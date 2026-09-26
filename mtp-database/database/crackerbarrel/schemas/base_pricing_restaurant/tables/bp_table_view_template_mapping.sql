--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_table_view_template_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_table_view_template_mapping

CREATE TABLE base_pricing_restaurant.bp_table_view_template_mapping (
	mapping_id int4 NOT NULL,
	table_id int4 NOT NULL,
	view_type_id int4 NOT NULL,
	template_id int4 NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_screen_view_template_mapping_pkey PRIMARY KEY (mapping_id),
	CONSTRAINT unique_table_view UNIQUE (table_id, view_type_id),
	CONSTRAINT bp_screen_view_template_mapping_template_id_fkey FOREIGN KEY (template_id) REFERENCES base_pricing_restaurant.bp_templates_metadata(template_id) ON DELETE SET NULL,
	CONSTRAINT bp_screen_view_template_mapping_view_type_id_fkey FOREIGN KEY (view_type_id) REFERENCES base_pricing_restaurant.bp_view_type_metadata(view_type_id) ON DELETE CASCADE,
	CONSTRAINT bp_table_view_template_mapping_table_id_fkey FOREIGN KEY (table_id) REFERENCES base_pricing_restaurant.bp_table_metadata(table_id) ON DELETE CASCADE
);