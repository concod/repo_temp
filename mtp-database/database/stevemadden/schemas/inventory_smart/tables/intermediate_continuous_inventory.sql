--liquibase formatted sql
--changeset liquibase:intermediate_continuous_inventory stripComments:false splitStatements:false context:MTP-62087 labels:MTP-62087
--comment: MTP-62087
--rollback: SELECT 1

CREATE TABLE if NOT exists inventory_smart.intermediate_continuous_inventory (
	brand varchar NULL,
	channel varchar NOT NULL,
	product_code varchar NOT NULL,
	pack_id varchar NULL,
	store_code varchar NOT NULL,
	inventory_date varchar NULL,
	oh float8 NULL,
	it float8 NULL,
	oo float8 NULL,
	created_date varchar NULL
);