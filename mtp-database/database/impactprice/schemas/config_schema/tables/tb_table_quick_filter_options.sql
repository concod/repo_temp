--liquibase formatted sql
--changeset liquibase:tb_quick_filter_options_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_quick_filter_options_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_quick_filter_options_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_quick_filter_options stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_quick_filter_options

CREATE TABLE config_schema.tb_table_quick_filter_options (
	id integer DEFAULT nextval('config_schema.tb_quick_filter_options_id_seq'::regclass) NOT NULL,
	quick_filter_id int4 NOT NULL,
	label_key varchar NOT NULL,
	label_display_name varchar NOT NULL,
	filter_type varchar NOT NULL,
	label_value varchar NULL,
	display_order int4 DEFAULT 0 NULL,
	is_active bool DEFAULT true NULL,
	config jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT tb_quick_filter_options_unique UNIQUE (quick_filter_id, label_key, label_display_name),
	CONSTRAINT tb_quick_filter_options_pkey PRIMARY KEY (id),
	CONSTRAINT tb_quick_filter_options_quick_filters_fk FOREIGN KEY (quick_filter_id) REFERENCES config_schema.tb_table_quick_filters(id) ON DELETE CASCADE,
	CONSTRAINT tb_quick_filter_options_filter_type_check CHECK (((filter_type)::text = ANY ((ARRAY['COLUMN'::character varying, 'ROW'::character varying, 'COLUMN_GROUP'::character varying, 'column'::character varying, 'row'::character varying, 'column_group'::character varying])::text[])))
);
