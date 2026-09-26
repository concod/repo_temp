--liquibase formatted sql
--changeset liquibase:tb_screen_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_screen_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_screen_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_screen_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_screen_configurations

CREATE TABLE config_schema.tb_screen_configurations (
	id integer DEFAULT nextval('config_schema.tb_screen_configurations_id_seq'::regclass) NOT NULL,
	screen_id varchar(100) NOT NULL,
	screen_code varchar(100) NOT NULL,
	screen_name varchar(255) NOT NULL,
	page_title varchar(255),
	breadcrumb_label varchar(255),
	context_id integer,
	screen_type_id integer,
	route_path varchar(255) NOT NULL,
	is_active boolean DEFAULT true,
	display_order integer DEFAULT 0,
	meta_description varchar(500),
	icon_path varchar(255),
	current_version integer DEFAULT 1,
	custom_config jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	layout_config jsonb,
	screen_actions jsonb,
	CONSTRAINT tb_screen_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_screen_configurations_context_id_fkey FOREIGN KEY (context_id) REFERENCES config_schema.tb_config_context(context_id) ON DELETE RESTRICT,
	CONSTRAINT tb_screen_configurations_screen_type_id_fkey FOREIGN KEY (screen_type_id) REFERENCES config_schema.tb_screen_type_mst(screen_type_id) ON DELETE SET NULL
);
CREATE INDEX idx_screen_active ON config_schema.tb_screen_configurations USING btree (is_active);
CREATE INDEX idx_screen_active_only ON config_schema.tb_screen_configurations USING btree (context_id, display_order) WHERE (is_active = true);
CREATE INDEX idx_screen_context ON config_schema.tb_screen_configurations USING btree (context_id) WHERE (context_id IS NOT NULL);
CREATE INDEX idx_screen_custom_config_gin ON config_schema.tb_screen_configurations USING gin (custom_config);
CREATE INDEX idx_screen_list_covering ON config_schema.tb_screen_configurations USING btree (context_id, display_order) INCLUDE (screen_id, screen_name, route_path, is_active) WHERE (is_active = true);
CREATE INDEX idx_screen_module_active ON config_schema.tb_screen_configurations USING btree (context_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_screen_module_route ON config_schema.tb_screen_configurations USING btree (context_id, route_path);
CREATE INDEX idx_screen_name_text ON config_schema.tb_screen_configurations USING btree (lower((screen_name)::text) text_pattern_ops);
CREATE INDEX idx_screen_route ON config_schema.tb_screen_configurations USING btree (route_path);
CREATE INDEX idx_screen_type ON config_schema.tb_screen_configurations USING btree (screen_type_id);
CREATE UNIQUE INDEX uq_screen_context ON config_schema.tb_screen_configurations USING btree (context_id, screen_id) WHERE (context_id IS NOT NULL);
CREATE UNIQUE INDEX uq_screen_no_context ON config_schema.tb_screen_configurations USING btree (screen_id) WHERE (context_id IS NULL);
