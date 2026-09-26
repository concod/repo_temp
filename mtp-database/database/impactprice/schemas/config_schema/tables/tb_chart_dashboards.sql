--liquibase formatted sql
--changeset liquibase:tb_chart_dashboards_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_dashboards_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_chart_dashboards_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_chart_dashboards stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_dashboards

CREATE TABLE config_schema.tb_chart_dashboards (
	id integer DEFAULT nextval('config_schema.tb_chart_dashboards_id_seq'::regclass) NOT NULL,
	section_config_id integer,
	dashboard_name varchar(255) NOT NULL,
	dashboard_code varchar(100) NOT NULL,
	description text,
	layout_config jsonb DEFAULT '{}'::jsonb,
	global_filter_config jsonb DEFAULT '{}'::jsonb,
	refresh_interval_ms integer DEFAULT 0,
	theme_config jsonb DEFAULT '{}'::jsonb,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	created_by varchar(255),
	updated_by varchar(255),
	status varchar(20) DEFAULT 'draft'::character varying NOT NULL,
	version_number integer DEFAULT 1 NOT NULL,
	context_id integer,
	published_at timestamp without time zone,
	published_by varchar(255),
	parent_dashboard_id integer,
	CONSTRAINT tb_chart_dashboards_pkey PRIMARY KEY (id),
	CONSTRAINT tb_chart_dashboards_context_id_fkey FOREIGN KEY (context_id) REFERENCES config_schema.tb_config_context(context_id) ON DELETE RESTRICT,
	CONSTRAINT tb_chart_dashboards_parent_dashboard_id_fkey FOREIGN KEY (parent_dashboard_id) REFERENCES config_schema.tb_chart_dashboards(id) ON DELETE SET NULL,
	CONSTRAINT tb_chart_dashboards_section_config_id_fkey FOREIGN KEY (section_config_id) REFERENCES config_schema.tb_section_configurations(id) ON DELETE SET NULL
);
CREATE INDEX idx_chart_dashboards_code_ctx ON config_schema.tb_chart_dashboards USING btree (dashboard_code, context_id);
CREATE INDEX idx_chart_dashboards_context ON config_schema.tb_chart_dashboards USING btree (context_id);
CREATE INDEX idx_chart_dashboards_parent ON config_schema.tb_chart_dashboards USING btree (parent_dashboard_id);
CREATE INDEX idx_chart_dashboards_section ON config_schema.tb_chart_dashboards USING btree (section_config_id);
CREATE INDEX idx_chart_dashboards_status ON config_schema.tb_chart_dashboards USING btree (status);
