--liquibase formatted sql
--changeset liquibase:tb_chart_items_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_items_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_chart_items_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_chart_items stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_items

CREATE TABLE config_schema.tb_chart_items (
	id integer DEFAULT nextval('config_schema.tb_chart_items_id_seq'::regclass) NOT NULL,
	dashboard_id integer NOT NULL,
	group_id integer,
	data_source_id integer,
	chart_name varchar(255) NOT NULL,
	chart_code varchar(100) NOT NULL,
	chart_type varchar(50) DEFAULT 'bar'::character varying NOT NULL,
	chart_config jsonb DEFAULT '{}'::jsonb,
	layout_position jsonb DEFAULT '{"h": 4, "w": 6, "x": 0, "y": 0}'::jsonb,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_chart_items_pkey PRIMARY KEY (id),
	CONSTRAINT tb_chart_items_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES config_schema.tb_chart_dashboards(id) ON DELETE CASCADE,
	CONSTRAINT tb_chart_items_data_source_id_fkey FOREIGN KEY (data_source_id) REFERENCES config_schema.tb_chart_data_sources(id) ON DELETE SET NULL,
	CONSTRAINT tb_chart_items_group_id_fkey FOREIGN KEY (group_id) REFERENCES config_schema.tb_chart_groups(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX idx_chart_items_code ON config_schema.tb_chart_items USING btree (dashboard_id, chart_code);
CREATE INDEX idx_chart_items_dashboard ON config_schema.tb_chart_items USING btree (dashboard_id);
CREATE INDEX idx_chart_items_data_source ON config_schema.tb_chart_items USING btree (data_source_id);
CREATE INDEX idx_chart_items_group ON config_schema.tb_chart_items USING btree (group_id);
