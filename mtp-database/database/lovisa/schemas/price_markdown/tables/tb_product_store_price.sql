--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:tb_product_store_price_24092025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for price_markdown.tb_product_store_price


CREATE TABLE price_markdown.tb_product_store_price (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	lifecycle_indicator text NULL,
	original_price float4 NULL,
	current_price float4 NULL,
	effective_from_date date NULL,
	updated_at date NULL,
	last_reg_price float4 NULL,
	currency_id int4 NOT NULL,
	original_price_with_vat float4 NULL,
	current_price_with_vat float4 NULL,
	last_reg_price_with_vat float4 NULL,
	CONSTRAINT tb_product_store_price_mkd_pk PRIMARY KEY (product_id, store_id)
);

--changeset durgaprasad.tulugu@impactanalytics.co:changed_column_data_types stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed column data types.
ALTER TABLE price_markdown.tb_product_store_price ALTER COLUMN lifecycle_indicator SET NOT NULL;
ALTER TABLE price_markdown.tb_product_store_price ALTER COLUMN updated_at TYPE timestamptz;

--changeset keerthana.reddy@impactanalytics.co:tb_product_store_price_06112025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema 

ALTER TABLE price_markdown.tb_product_store_price RENAME COLUMN original_price TO msrp;
ALTER TABLE price_markdown.tb_product_store_price RENAME COLUMN original_price_with_vat TO msrp_with_vat;
ALTER TABLE price_markdown.tb_product_store_price
    ADD COLUMN cost FLOAT4 NULL,
    ADD COLUMN territory_currency_id INT4 NULL,
    ADD COLUMN msrp_territory FLOAT4 NULL,
    ADD COLUMN msrp_territory_with_vat FLOAT4 NULL,
    ADD COLUMN cost_territory FLOAT4 NULL,
    ADD COLUMN default_currency_id INT4 NULL,
    ADD COLUMN msrp_default FLOAT4 NULL,
    ADD COLUMN msrp_default_with_vat FLOAT4 NULL,
    ADD COLUMN cost_default FLOAT4 NULL;
