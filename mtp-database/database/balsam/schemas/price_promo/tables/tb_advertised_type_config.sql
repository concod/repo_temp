--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_advertised_type_config_1  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_advertised_type_config


-- DROP TABLE price_promo.tb_advertised_type_config;

CREATE TABLE price_promo.tb_advertised_type_config (
	id int4 NOT NULL,
	advertised_type price_promo.advertised_type_enum NULL,
	CONSTRAINT tb_advertised_type_config_id_check CHECK ((id = ANY (ARRAY[1, 2]))),
	CONSTRAINT tb_advertised_type_config_pkey PRIMARY KEY (id),
	CONSTRAINT tb_advertised_type_config_ukey UNIQUE (id, advertised_type)
);
CREATE INDEX idx_advertised_type_id ON price_promo.tb_advertised_type_config USING btree (id);
