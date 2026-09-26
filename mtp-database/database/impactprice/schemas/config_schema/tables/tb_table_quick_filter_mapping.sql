--liquibase formatted sql
--changeset liquibase:tb_table_quick_filter_mapping_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_quick_filter_mapping_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_table_quick_filter_mapping_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_quick_filter_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_quick_filter_mapping

CREATE TABLE config_schema.tb_table_quick_filter_mapping (
	id integer DEFAULT nextval('config_schema.tb_table_quick_filter_mapping_id_seq'::regclass) NOT NULL,
	table_config_id integer NOT NULL,
	quick_filter_id integer NOT NULL,
	is_active boolean DEFAULT true,
	CONSTRAINT tb_table_quick_filter_mapping_unique UNIQUE (table_config_id, quick_filter_id),
	CONSTRAINT tb_table_quick_filter_mapping_pkey PRIMARY KEY (id),
	CONSTRAINT tb_table_quick_filter_mapping_quick_filters_fk FOREIGN KEY (quick_filter_id) REFERENCES config_schema.tb_table_quick_filters(id) ON DELETE CASCADE,
	CONSTRAINT tb_table_quick_filter_mapping_table_configurations_fk FOREIGN KEY (table_config_id) REFERENCES config_schema.tb_table_configurations(id) ON DELETE CASCADE
);
