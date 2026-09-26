--liquibase formatted sql
--changeset liquibase:tb_kpi_card_groups_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_card_groups_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_kpi_card_groups_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_kpi_card_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_card_groups

CREATE TABLE config_schema.tb_kpi_card_groups (
	id integer DEFAULT nextval('config_schema.tb_kpi_card_groups_id_seq'::regclass) NOT NULL,
	container_id integer NOT NULL,
	group_name varchar(255) NOT NULL,
	group_code varchar(100) NOT NULL,
	template_id integer,
	data_source_api varchar(500),
	data_source_method varchar(10) DEFAULT 'POST'::character varying,
	data_source_params jsonb,
	data_response_path varchar(255) DEFAULT 'data.rows'::character varying,
	available_columns jsonb,
	group_by_columns jsonb DEFAULT '[]'::jsonb,
	sort_config jsonb DEFAULT '[]'::jsonb,
	custom_sort_order jsonb,
	card_orientation varchar(20) DEFAULT 'horizontal'::character varying,
	cards_per_row integer DEFAULT 5,
	card_gap integer DEFAULT 16,
	card_min_width integer,
	card_max_width integer,
	card_size varchar(20) DEFAULT 'medium'::character varying,
	show_empty_state boolean DEFAULT true,
	empty_state_message varchar(255),
	loading_skeleton_count integer DEFAULT 4,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	responsive_config jsonb,
	click_action jsonb,
	feature_config jsonb DEFAULT '{}'::jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	data_source_type varchar(20) DEFAULT 'api'::character varying,
	store_path varchar(500),
	store_action_trigger varchar(255),
	data_context_path varchar(255),
	CONSTRAINT tb_kpi_card_groups_container_id_group_code_key UNIQUE (container_id, group_code),
	CONSTRAINT tb_kpi_card_groups_pkey PRIMARY KEY (id),
	CONSTRAINT tb_kpi_card_groups_container_id_fkey FOREIGN KEY (container_id) REFERENCES config_schema.tb_kpi_container_configurations(id) ON DELETE CASCADE,
	CONSTRAINT tb_kpi_card_groups_template_id_fkey FOREIGN KEY (template_id) REFERENCES config_schema.tb_kpi_card_templates(id) ON DELETE SET NULL
);
CREATE INDEX idx_kpi_group_container ON config_schema.tb_kpi_card_groups USING btree (container_id);
CREATE INDEX idx_kpi_group_order ON config_schema.tb_kpi_card_groups USING btree (container_id, display_order);
CREATE INDEX idx_kpi_group_template ON config_schema.tb_kpi_card_groups USING btree (template_id);
