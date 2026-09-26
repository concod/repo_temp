 --liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_product_store_version stripComments:false splitStatements:false context:marksmart_product_store_version
    --comment: initial changeset for marksmart_product_store_version




CREATE TABLE price_markdown.marksmart_product_store_version (
	version_code int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	lifecycle_indicator text NOT NULL,
	msrp float4 NULL,
	current_price float4 NULL,
	effective_from_date date NULL,
	updated_at timestamptz NULL,
	last_reg_price float4 NULL,
	currency_id int4 NULL,
	msrp_with_vat float4 NULL,
	current_price_with_vat float4 NULL,
	last_reg_price_with_vat float4 NULL,
	"cost" float4 NULL,
	territory_currency_id int4 NULL,
	msrp_territory float4 NULL,
	msrp_territory_with_vat float4 NULL,
	cost_territory float4 NULL,
	default_currency_id int4 NULL,
	msrp_default float4 NULL,
	msrp_default_with_vat float4 NULL,
	cost_default float4 NULL,
	CONSTRAINT tb_product_store_price_mkd_pk_5 PRIMARY KEY (version_code, product_id, store_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX marksmart_product_store_id_idx ON price_markdown.marksmart_product_store_version USING btree (version_code, product_id, store_id);
