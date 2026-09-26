--liquibase formatted sql
--changeset liquibase:tb_kpi_calculated_fields_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_calculated_fields_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_kpi_calculated_fields_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_kpi_calculated_fields stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_calculated_fields

CREATE TABLE config_schema.tb_kpi_calculated_fields (
	id integer DEFAULT nextval('config_schema.tb_kpi_calculated_fields_id_seq'::regclass) NOT NULL,
	card_group_id integer NOT NULL,
	field_name varchar(255) NOT NULL,
	field_code varchar(100) NOT NULL,
	formula_expression text NOT NULL,
	result_type varchar(30) DEFAULT 'number'::character varying,
	display_order integer DEFAULT 0 NOT NULL,
	is_active boolean DEFAULT true NOT NULL,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_kpi_calculated_fields_card_group_id_field_code_key UNIQUE (card_group_id, field_code),
	CONSTRAINT tb_kpi_calculated_fields_pkey PRIMARY KEY (id),
	CONSTRAINT tb_kpi_calculated_fields_card_group_id_fkey FOREIGN KEY (card_group_id) REFERENCES config_schema.tb_kpi_card_groups(id) ON DELETE CASCADE
);
CREATE INDEX idx_kpi_calc_field_group ON config_schema.tb_kpi_calculated_fields USING btree (card_group_id);
CREATE INDEX idx_kpi_calc_field_order ON config_schema.tb_kpi_calculated_fields USING btree (card_group_id, display_order);
