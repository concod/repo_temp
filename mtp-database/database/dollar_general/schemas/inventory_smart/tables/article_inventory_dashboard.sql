--liquibase formatted sql
--changeset swapnil.bhange:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:0033
--comment: initial changeset for article_inventory_dashboard
CREATE TABLE inventory_smart.article_inventory_dashboard (
	article varchar NOT NULL,
	primary_sku varchar NOT NULL,
	product_description varchar NULL,
	l0_code varchar NULL,
	l0_name varchar NULL,
	store_band int4 NULL,
	store_code varchar NULL,
	store_name varchar NULL,
	l1_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	std_actual_st_percentage float4 NULL,
	price_point float4 NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	total_inv float4 NULL,
	dc_oh float4 NULL,
	lw_revenue int4 NULL,
	lw_margin int4 NULL,
	promo_percentage float4 NULL,
	excess int4 NULL,
	normal int4 NULL,
	shortfall int4 NULL,
	stockout int4 NULL,
	last_allocated int4 NULL,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code)
);
CREATE INDEX article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (primary_sku);
CREATE INDEX article_inventory_dashboard_store_code_idx ON inventory_smart.article_inventory_dashboard USING btree (store_code);


-- inventory_smart.article_inventory_dashboard foreign keys

ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset swapnil.bhange-2:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:aid_2
--comment: changed store_band to psa_name for article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN store_band to psa_name;


--changeset swapnil.bhange-3:article_inventory_dashboard_table stripComments:false splitStatements:false context:Release_1_0 labels:0065
--comment: alter schema for article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS store_code;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS store_name;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS psa_name;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP CONSTRAINT IF EXISTS article_inventory_dashboard_un;
DROP INDEX if EXISTS article_inventory_dashboard_article_idx;
DROP INDEX if EXISTS article_inventory_dashboard_store_code_idx;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_un_1 UNIQUE (article);
CREATE INDEX article_inventory_dashboard_article_idx_2 ON inventory_smart.article_inventory_dashboard USING btree (article);

--changeset swapnil.bhange-4:article_inventory_dashboard_table stripComments:false splitStatements:false context:Release_1_0 labels:0069
--comment: alter schema added new column for article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN lw_qty INT4;

