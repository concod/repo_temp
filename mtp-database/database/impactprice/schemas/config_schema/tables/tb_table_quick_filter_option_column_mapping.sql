--liquibase formatted sql
--changeset liquibase:tb_quick_filter_option_column_mapping_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_quick_filter_option_column_mapping_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_quick_filter_option_column_mapping_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_quick_filter_option_column_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_quick_filter_option_column_mapping

CREATE TABLE config_schema.tb_table_quick_filter_option_column_mapping (
	id integer DEFAULT nextval('config_schema.tb_quick_filter_option_column_mapping_id_seq'::regclass) NOT NULL,
	quick_filter_option_id integer NOT NULL,
	column_config_id integer NOT NULL,
	CONSTRAINT tb_quick_filter_option_column_mapping_unique UNIQUE (quick_filter_option_id, column_config_id),
	CONSTRAINT tb_quick_filter_option_column_mapping_pkey PRIMARY KEY (id),
	CONSTRAINT tb_quick_filter_option_column_mapping_column_configurations_fk FOREIGN KEY (column_config_id) REFERENCES config_schema.tb_table_column_configurations(id) ON DELETE CASCADE,
	CONSTRAINT tb_quick_filter_option_column_mapping_quick_filter_options_fk FOREIGN KEY (quick_filter_option_id) REFERENCES config_schema.tb_table_quick_filter_options(id) ON DELETE CASCADE
);
