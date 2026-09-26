--liquibase formatted sql
--changeset liquibase:tb_filter_data_source_params_mst_param_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_data_source_params_mst_param_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_data_source_params_mst_param_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_data_source_params_mst stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_data_source_params_mst

CREATE TABLE config_schema.tb_filter_data_source_params_mst (
	param_id integer DEFAULT nextval('config_schema.tb_filter_data_source_params_mst_param_id_seq'::regclass) NOT NULL,
	data_source_id integer NOT NULL,
	param_name varchar(100) NOT NULL,
	param_type varchar(50) NOT NULL,
	is_required boolean DEFAULT false,
	default_value text,
	validation_rules jsonb,
	description text,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_filter_data_source_params_mst_data_source_id_param_name_key UNIQUE (data_source_id, param_name),
	CONSTRAINT tb_filter_data_source_params_mst_pkey PRIMARY KEY (param_id),
	CONSTRAINT tb_filter_data_source_params_mst_data_source_id_fkey FOREIGN KEY (data_source_id) REFERENCES config_schema.tb_filter_data_source_mst(data_source_id) ON DELETE CASCADE,
	CONSTRAINT chk_param_type CHECK (((param_type)::text = ANY (ARRAY[('string'::character varying)::text, ('integer'::character varying)::text, ('array'::character varying)::text, ('date'::character varying)::text, ('boolean'::character varying)::text, ('json'::character varying)::text])))
);
CREATE INDEX idx_filter_ds_params_source ON config_schema.tb_filter_data_source_params_mst USING btree (data_source_id);
