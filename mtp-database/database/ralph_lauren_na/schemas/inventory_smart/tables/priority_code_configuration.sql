--liquibase formatted sql
--changeset kailash:priority_code_configuration stripComments:false splitStatements:false context:MTP-40708 labels:RalphLauren
--comment : initial changeset for priority_code_config

CREATE TABLE inventory_smart.priority_code_configuration (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NOT NULL,
	priority_code varchar NULL,
	l0_name varchar NULL,
	updated_at timestamptz NULL DEFAULT now(),
	updated_by int4 NULL,
	instore_date date NULL DEFAULT CURRENT_DATE,
	CONSTRAINT article_store_un UNIQUE (article, store_code, l0_name),
	CONSTRAINT priority_code_configuration_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code)
)
PARTITION BY LIST (l0_name);