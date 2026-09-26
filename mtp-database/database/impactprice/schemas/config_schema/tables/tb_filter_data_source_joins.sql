--liquibase formatted sql
--changeset liquibase:tb_filter_data_source_joins_join_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_data_source_joins_join_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_data_source_joins_join_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_data_source_joins stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_data_source_joins

CREATE TABLE config_schema.tb_filter_data_source_joins (
	join_id integer DEFAULT nextval('config_schema.tb_filter_data_source_joins_join_id_seq'::regclass) NOT NULL,
	primary_data_source_id integer NOT NULL,
	joined_data_source_id integer NOT NULL,
	join_type varchar(20) DEFAULT 'INNER'::character varying,
	join_condition text NOT NULL,
	primary_field_prefix varchar(50),
	joined_field_prefix varchar(50),
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_filter_data_source_joins_pkey PRIMARY KEY (join_id),
	CONSTRAINT tb_filter_data_source_joins_joined_data_source_id_fkey FOREIGN KEY (joined_data_source_id) REFERENCES config_schema.tb_filter_data_source_mst(data_source_id) ON DELETE CASCADE,
	CONSTRAINT tb_filter_data_source_joins_primary_data_source_id_fkey FOREIGN KEY (primary_data_source_id) REFERENCES config_schema.tb_filter_data_source_mst(data_source_id) ON DELETE CASCADE,
	CONSTRAINT chk_different_sources CHECK ((primary_data_source_id <> joined_data_source_id)),
	CONSTRAINT chk_join_type CHECK (((join_type)::text = ANY (ARRAY[('INNER'::character varying)::text, ('LEFT'::character varying)::text, ('RIGHT'::character varying)::text, ('FULL'::character varying)::text])))
);
CREATE INDEX idx_filter_ds_joins_joined ON config_schema.tb_filter_data_source_joins USING btree (joined_data_source_id);
CREATE INDEX idx_filter_ds_joins_primary ON config_schema.tb_filter_data_source_joins USING btree (primary_data_source_id);
