--liquibase formatted sql
--changeset liquibase:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for latest_inventory

CREATE TABLE inventory_smart.latest_inventory (
	"date" date NOT NULL,
	channel varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX latest_inventory_date_idx ON  inventory_smart.latest_inventory USING btree (date);
CREATE INDEX latest_inventory_product_code_idx ON  inventory_smart.latest_inventory USING btree (product_code);
CREATE INDEX latest_inventory_store_code_idx ON  inventory_smart.latest_inventory USING btree (store_code);