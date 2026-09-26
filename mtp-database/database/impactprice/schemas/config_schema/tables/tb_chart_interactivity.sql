--liquibase formatted sql
--changeset liquibase:tb_chart_interactivity_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_interactivity_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_chart_interactivity_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_chart_interactivity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_interactivity

CREATE TABLE config_schema.tb_chart_interactivity (
	id integer DEFAULT nextval('config_schema.tb_chart_interactivity_id_seq'::regclass) NOT NULL,
	chart_item_id integer NOT NULL,
	master_filter_mode varchar(20) DEFAULT 'none'::character varying,
	cross_data_source_filter boolean DEFAULT false,
	ignore_master_filters boolean DEFAULT false,
	drill_down_enabled boolean DEFAULT false,
	drill_down_fields jsonb DEFAULT '[]'::jsonb,
	target_chart_ids jsonb,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_chart_interactivity_chart_item_id_key UNIQUE (chart_item_id),
	CONSTRAINT tb_chart_interactivity_pkey PRIMARY KEY (id),
	CONSTRAINT tb_chart_interactivity_chart_item_id_fkey FOREIGN KEY (chart_item_id) REFERENCES config_schema.tb_chart_items(id) ON DELETE CASCADE
);
CREATE INDEX idx_chart_interactivity_item ON config_schema.tb_chart_interactivity USING btree (chart_item_id);
