--liquibase formatted sql
--changeset liquibase:tb_chart_data_sources_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_data_sources_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_chart_data_sources_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_chart_data_sources stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_data_sources

CREATE TABLE config_schema.tb_chart_data_sources (
	id integer DEFAULT nextval('config_schema.tb_chart_data_sources_id_seq'::regclass) NOT NULL,
	dashboard_id integer NOT NULL,
	source_name varchar(255) NOT NULL,
	source_code varchar(100) NOT NULL,
	endpoint_id integer,
	endpoint_url varchar(500),
	endpoint_type varchar(20) DEFAULT 'query'::character varying,
	http_method varchar(10) DEFAULT 'POST'::character varying,
	request_payload jsonb DEFAULT '{}'::jsonb,
	response_data_path varchar(255) DEFAULT 'data'::character varying,
	discovered_columns jsonb DEFAULT '[]'::jsonb,
	calculated_fields jsonb DEFAULT '[]'::jsonb,
	cache_ttl_seconds integer DEFAULT 0,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_chart_data_sources_pkey PRIMARY KEY (id),
	CONSTRAINT tb_chart_data_sources_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES config_schema.tb_chart_dashboards(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_chart_data_sources_code ON config_schema.tb_chart_data_sources USING btree (dashboard_id, source_code);
CREATE INDEX idx_chart_data_sources_dashboard ON config_schema.tb_chart_data_sources USING btree (dashboard_id);
