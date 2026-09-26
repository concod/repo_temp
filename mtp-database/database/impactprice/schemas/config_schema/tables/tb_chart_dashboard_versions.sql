--liquibase formatted sql
--changeset liquibase:tb_chart_dashboard_versions_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_dashboard_versions_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_chart_dashboard_versions_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_chart_dashboard_versions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_dashboard_versions

CREATE TABLE config_schema.tb_chart_dashboard_versions (
	id integer DEFAULT nextval('config_schema.tb_chart_dashboard_versions_id_seq'::regclass) NOT NULL,
	dashboard_id integer NOT NULL,
	version_number integer NOT NULL,
	version_label varchar(255),
	version_notes text,
	status varchar(20) DEFAULT 'draft'::character varying NOT NULL,
	snapshot jsonb NOT NULL,
	created_at timestamp without time zone DEFAULT now(),
	created_by varchar(255),
	published_at timestamp without time zone,
	published_by varchar(255),
	CONSTRAINT uq_dashboard_version UNIQUE (dashboard_id, version_number),
	CONSTRAINT tb_chart_dashboard_versions_pkey PRIMARY KEY (id),
	CONSTRAINT tb_chart_dashboard_versions_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES config_schema.tb_chart_dashboards(id) ON DELETE CASCADE
);
CREATE INDEX idx_chart_dash_versions_dashboard ON config_schema.tb_chart_dashboard_versions USING btree (dashboard_id);
CREATE INDEX idx_chart_dash_versions_status ON config_schema.tb_chart_dashboard_versions USING btree (status);
