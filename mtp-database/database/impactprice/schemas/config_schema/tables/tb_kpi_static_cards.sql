--liquibase formatted sql
--changeset liquibase:tb_kpi_static_cards_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_static_cards_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_kpi_static_cards_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_kpi_static_cards stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_static_cards

CREATE TABLE config_schema.tb_kpi_static_cards (
	id integer DEFAULT nextval('config_schema.tb_kpi_static_cards_id_seq'::regclass) NOT NULL,
	card_group_id integer NOT NULL,
	card_label varchar(255) NOT NULL,
	placeholder_values jsonb DEFAULT '{}'::jsonb NOT NULL,
	custom_styles jsonb,
	click_action jsonb,
	position_type varchar(20) DEFAULT 'end'::character varying,
	position_index integer DEFAULT 0,
	display_order integer DEFAULT 0 NOT NULL,
	is_active boolean DEFAULT true NOT NULL,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_kpi_static_cards_pkey PRIMARY KEY (id),
	CONSTRAINT tb_kpi_static_cards_card_group_id_fkey FOREIGN KEY (card_group_id) REFERENCES config_schema.tb_kpi_card_groups(id) ON DELETE CASCADE
);
CREATE INDEX idx_kpi_static_card_group ON config_schema.tb_kpi_static_cards USING btree (card_group_id);
CREATE INDEX idx_kpi_static_card_order ON config_schema.tb_kpi_static_cards USING btree (card_group_id, display_order);
