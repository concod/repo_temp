--liquibase formatted sql
--changeset liquibase:dc_product_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_product_reserve_quantity

CREATE TABLE inventory_smart.dc_product_reserve_quantity (
	dc_code int4 NOT NULL,
	product_code varchar NOT NULL,
	subsku varchar NOT NULL,
	channel varchar NOT NULL,
	"type" varchar NOT NULL,
	quantity int4 NOT NULL,
	store_name varchar NULL,
	dc_name varchar NULL,
	created_at timestamptz NULL DEFAULT CURRENT_DATE,
	updated_at timestamptz NULL DEFAULT CURRENT_DATE,
	CONSTRAINT dc_product_reserve_quantity_pk PRIMARY KEY (dc_code, product_code, subsku, channel, type)
)
PARTITION BY LIST (channel);






