--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:store_stock_drilldown stripComments:false splitStatements:false context:Release_1_0 labels:sm_store_stock_drilldown
--comment: initial changeset for store_stock_drilldown

CREATE TABLE IF NOT EXISTS inventory_smart.store_stock_drilldown (
	store_avail_oh float4 NULL,
	store_in_transit float4 NULL,
	oh_dc int4 NULL,
	article varchar NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NOT NULL,
	oo int4 NULL,
	tot_inv float4 NULL,
	lw_qty int4 NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	promo_percentage float4 NULL,
	wos_predicted float4 NULL,
	store_level_prediction float4 NULL,
	size_integrity float4 NULL,
	style_color_status varchar NULL,
	store_status varchar NULL,
	excess int4 NULL,
	normal int4 NULL,
	shortfall int4 NULL,
	stockout int4 NULL,
	available_stores_percentage float4 NULL,
	week_to_date_sales int4 NULL,
	last_day_sales int4 NULL,
	oo_dc int4 NULL,
	it_dc float4 NULL,
	"date" date NOT NULL,
	instock_pct float4 NULL,
	sales_1_ago float4 NULL,
	sales_2_ago float4 NULL,
	sales_3_ago float4 NULL,
	sales_4_ago float4 NULL,
	wos_predicted_oh float4 NULL,
	wos_predicted_oh_it float4 NULL,
	CONSTRAINT store_stock_drilldown_un UNIQUE (product_code, channel, date, store_code),
	CONSTRAINT store_stock_drilldown_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT store_stock_drilldown_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX store_stock_drilldown_article_idx ON inventory_smart.store_stock_drilldown USING btree (article, channel);
CREATE INDEX store_stock_drilldown_product_code_idx ON inventory_smart.store_stock_drilldown USING btree (product_code, channel);

--changeset samridhi.gupta@impactanalytics.co:new_column_added stripComments:false splitStatements:false context:Release_1_0 labels:new_column
--comment: new column
ALTER TABLE inventory_smart.store_stock_drilldown ADD COLUMN IF NOT EXISTS store_grade VARCHAR NULL;