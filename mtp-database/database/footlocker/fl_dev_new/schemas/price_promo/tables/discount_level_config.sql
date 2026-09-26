--liquibase formatted sql
--changeset liquibase:discount_level_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for discount_level_config

CREATE TABLE price_promo.discount_level_config (
	discount_level_id int4 NOT NULL,
	discount_level_value varchar(100) NOT NULL,
	category varchar NOT NULL,
	id_key varchar(100) NULL,
	value_key varchar(100) NULL,
	CONSTRAINT discount_level_config_pk PRIMARY KEY (discount_level_id, category)
);