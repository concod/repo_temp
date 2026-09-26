--liquibase formatted sql
--changeset liquibase:tb_menu_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_menu_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_menu_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_menu_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_menu_configurations

CREATE TABLE config_schema.tb_menu_configurations (
	id integer DEFAULT nextval('config_schema.tb_menu_configurations_id_seq'::regclass) NOT NULL,
	menu_item_id varchar(100) NOT NULL,
	menu_mst_id integer,
	screen_config_id integer,
	parent_menu_id integer,
	menu_group_id integer,
	application_id integer,
	menu_label varchar(255) NOT NULL,
	menu_code varchar(100) NOT NULL,
	route_path varchar(255),
	icon_path varchar(255),
	display_order integer DEFAULT 0,
	is_visible boolean DEFAULT true,
	is_expanded_default boolean DEFAULT false,
	uam_code_array jsonb,
	tooltip varchar(255),
	badge_config jsonb,
	open_in_new_tab boolean DEFAULT false,
	is_disabled boolean DEFAULT false,
	disabled_tooltip varchar(255),
	menu_type varchar(50) DEFAULT 'link'::character varying,
	external_url varchar(500),
	permission_codes jsonb,
	custom_config jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_menu_configurations_menu_item_id_key UNIQUE (menu_item_id),
	CONSTRAINT tb_menu_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_menu_configurations_application_id_fkey FOREIGN KEY (application_id) REFERENCES config_schema.tb_application_mst(id) ON DELETE CASCADE,
	CONSTRAINT tb_menu_configurations_menu_group_id_fkey FOREIGN KEY (menu_group_id) REFERENCES config_schema.tb_menu_groups(id) ON DELETE SET NULL,
	CONSTRAINT tb_menu_configurations_menu_mst_id_fkey FOREIGN KEY (menu_mst_id) REFERENCES config_schema.tb_menu_mst(menu_id) ON DELETE SET NULL,
	CONSTRAINT tb_menu_configurations_parent_menu_id_fkey FOREIGN KEY (parent_menu_id) REFERENCES config_schema.tb_menu_configurations(id) ON DELETE CASCADE,
	CONSTRAINT tb_menu_configurations_screen_config_id_fkey FOREIGN KEY (screen_config_id) REFERENCES config_schema.tb_screen_configurations(id) ON DELETE SET NULL
);
CREATE INDEX idx_menu_config_group ON config_schema.tb_menu_configurations USING btree (menu_group_id);
CREATE INDEX idx_menu_config_menu_mst ON config_schema.tb_menu_configurations USING btree (menu_mst_id);
CREATE INDEX idx_menu_config_application ON config_schema.tb_menu_configurations USING btree (application_id);
CREATE INDEX idx_menu_config_order ON config_schema.tb_menu_configurations USING btree (display_order);
CREATE INDEX idx_menu_config_parent ON config_schema.tb_menu_configurations USING btree (parent_menu_id);
CREATE INDEX idx_menu_config_screen ON config_schema.tb_menu_configurations USING btree (screen_config_id);
CREATE INDEX idx_menu_config_visible ON config_schema.tb_menu_configurations USING btree (is_visible);
CREATE INDEX idx_menu_label_text ON config_schema.tb_menu_configurations USING btree (lower((menu_label)::text) text_pattern_ops);
CREATE INDEX idx_menu_module_parent ON config_schema.tb_menu_configurations USING btree (application_id, parent_menu_id);
CREATE INDEX idx_menu_module_visible ON config_schema.tb_menu_configurations USING btree (application_id, is_visible) WHERE (is_visible = true);
CREATE INDEX idx_menu_permission_codes_gin ON config_schema.tb_menu_configurations USING gin (permission_codes);
CREATE INDEX idx_menu_screen_module ON config_schema.tb_menu_configurations USING btree (screen_config_id, application_id);
CREATE INDEX idx_menu_visible_only ON config_schema.tb_menu_configurations USING btree (application_id, display_order) WHERE (is_visible = true);
