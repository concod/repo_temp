--liquibase formatted sql
--changeset liquibase:tb_chart_data_bindings_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_data_bindings_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_chart_data_bindings_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_chart_data_bindings stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_data_bindings

CREATE TABLE config_schema.tb_chart_data_bindings (
	id integer DEFAULT nextval('config_schema.tb_chart_data_bindings_id_seq'::regclass) NOT NULL,
	chart_item_id integer NOT NULL,
	binding_slot varchar(50) DEFAULT 'value'::character varying NOT NULL,
	source_column varchar(255) NOT NULL,
	aggregation varchar(20) DEFAULT 'NONE'::character varying,
	sort_direction varchar(4),
	format_string varchar(100),
	display_label varchar(255),
	conditional_styles jsonb DEFAULT '{}'::jsonb,
	display_order integer DEFAULT 0,
	is_visible boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_chart_data_bindings_pkey PRIMARY KEY (id),
	CONSTRAINT tb_chart_data_bindings_chart_item_id_fkey FOREIGN KEY (chart_item_id) REFERENCES config_schema.tb_chart_items(id) ON DELETE CASCADE
);
CREATE INDEX idx_chart_bindings_item ON config_schema.tb_chart_data_bindings USING btree (chart_item_id);
CREATE INDEX idx_chart_bindings_slot ON config_schema.tb_chart_data_bindings USING btree (chart_item_id, binding_slot);
