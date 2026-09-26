--liquibase formatted sql
--changeset liquibase:tb_customer_type_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_customer_type_config
CREATE TABLE price_promo.tb_customer_type_config (
	id int4 NOT NULL,
	customer_type price_promo."customer_type_enum" NULL,
	CONSTRAINT tb_customer_type_config_id_check CHECK ((id = ANY (ARRAY[0, 1]))),
	CONSTRAINT tb_customer_type_config_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_customer_type_id ON price_promo.tb_customer_type_config USING btree (id);