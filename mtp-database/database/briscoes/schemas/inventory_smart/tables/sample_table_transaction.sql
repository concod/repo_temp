--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:sample_table_transaction stripComments:false splitStatements:false context:Release_1_0 labels:sample_table_transaction
--comment: initial changeset for sample_table_transaction

CREATE TABLE IF NOT EXISTS inventory_smart.sample_table_transaction (
	product_code text NULL,
	article text NULL,
	store_code text NULL,
	"date" date NULL,
	qty int4 NULL,
	msrp numeric NULL,
	cost_excl_tax numeric NULL,
	discount_amount numeric NULL
);

ALTER TABLE inventory_smart.sample_table_transaction ADD COLUMN IF NOT EXISTS revenue numeric NULL;
