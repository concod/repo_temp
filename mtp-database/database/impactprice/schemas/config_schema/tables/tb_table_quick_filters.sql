--liquibase formatted sql
--changeset liquibase:tb_quick_filters_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_quick_filters_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_quick_filters_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_quick_filters stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_quick_filters

CREATE TABLE config_schema.tb_table_quick_filters (
	id integer DEFAULT nextval('config_schema.tb_quick_filters_id_seq'::regclass) NOT NULL,
	label_key varchar NOT NULL,
	label_display_name varchar NOT NULL,
	display_order int4 DEFAULT 0 NULL,
	is_active bool DEFAULT true NULL,
	table_config_id int4 NULL,
	CONSTRAINT tb_quick_filters_pkey PRIMARY KEY (id),
	CONSTRAINT tb_quick_filters_table_config_id_fkey FOREIGN KEY (table_config_id) REFERENCES config_schema.tb_table_configurations(id) ON DELETE CASCADE
);
