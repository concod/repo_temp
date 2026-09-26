--liquibase formatted sql
--changeset liquibase:customer_selection_type_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customer_selection_type_config
CREATE TABLE IF NOT EXISTS price_promo.customer_selection_type_config (
	id int4 NOT NULL,
	customer_selection_type price_promo."customer_selection_type_enum" NULL,
	CONSTRAINT customer_selection_type_config_pkey PRIMARY KEY (id),
	CONSTRAINT customer_selection_type_config_ukey UNIQUE (id, customer_selection_type)
);