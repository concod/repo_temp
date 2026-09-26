--liquibase formatted sql
--changeset liquibase:tb_chart_data_source_relationships_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_data_source_relationships_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_chart_data_source_relationships_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_chart_data_source_relationships stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_data_source_relationships

CREATE TABLE config_schema.tb_chart_data_source_relationships (
	id integer DEFAULT nextval('config_schema.tb_chart_data_source_relationships_id_seq'::regclass) NOT NULL,
	dashboard_id integer NOT NULL,
	source_id integer NOT NULL,
	target_source_id integer NOT NULL,
	source_field varchar(255) NOT NULL,
	target_field varchar(255) NOT NULL,
	relationship_type varchar(20) DEFAULT 'field_match'::character varying,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_chart_data_source_relationships_pkey PRIMARY KEY (id),
	CONSTRAINT tb_chart_data_source_relationships_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES config_schema.tb_chart_dashboards(id) ON DELETE CASCADE,
	CONSTRAINT tb_chart_data_source_relationships_source_id_fkey FOREIGN KEY (source_id) REFERENCES config_schema.tb_chart_data_sources(id) ON DELETE CASCADE,
	CONSTRAINT tb_chart_data_source_relationships_target_source_id_fkey FOREIGN KEY (target_source_id) REFERENCES config_schema.tb_chart_data_sources(id) ON DELETE CASCADE
);
CREATE INDEX idx_chart_relationships_dashboard ON config_schema.tb_chart_data_source_relationships USING btree (dashboard_id);
CREATE INDEX idx_chart_relationships_source ON config_schema.tb_chart_data_source_relationships USING btree (source_id);
CREATE INDEX idx_chart_relationships_target ON config_schema.tb_chart_data_source_relationships USING btree (target_source_id);
