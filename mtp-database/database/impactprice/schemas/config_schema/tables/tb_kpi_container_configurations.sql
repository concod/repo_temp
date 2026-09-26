--liquibase formatted sql
--changeset liquibase:tb_kpi_container_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_container_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_kpi_container_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_kpi_container_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_container_configurations

CREATE TABLE config_schema.tb_kpi_container_configurations (
	id integer DEFAULT nextval('config_schema.tb_kpi_container_configurations_id_seq'::regclass) NOT NULL,
	section_config_id integer NOT NULL,
	container_name varchar(255) NOT NULL,
	container_code varchar(100) NOT NULL,
	orientation varchar(20) DEFAULT 'vertical'::character varying,
	show_header boolean DEFAULT true,
	header_title varchar(255),
	is_collapsible boolean DEFAULT true,
	default_collapsed boolean DEFAULT false,
	container_styles jsonb DEFAULT '{}'::jsonb,
	responsive_config jsonb,
	refresh_interval_ms integer,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_kpi_container_configuratio_section_config_id_container_c_key UNIQUE (section_config_id, container_code),
	CONSTRAINT tb_kpi_container_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_kpi_container_configurations_section_config_id_fkey FOREIGN KEY (section_config_id) REFERENCES config_schema.tb_section_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_kpi_container_section ON config_schema.tb_kpi_container_configurations USING btree (section_config_id);
