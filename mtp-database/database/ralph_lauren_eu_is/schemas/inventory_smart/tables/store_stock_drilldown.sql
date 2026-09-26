--liquibase formatted sql
--changeset liquibase:store_stock_drilldown stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_stock_drilldown
CREATE TABLE inventory_smart.store_stock_drilldown (
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
	top_25_percent int4 NULL,
	oo_dc int4 NULL,
	it_dc float4 NULL,
	"date" date NOT NULL,
	CONSTRAINT store_stock_drilldown_un UNIQUE (product_code, channel, date, store_code)
);
CREATE INDEX store_stock_drilldown_article_idx ON inventory_smart.store_stock_drilldown USING btree (article, channel);
ALTER TABLE inventory_smart.store_stock_drilldown ADD CONSTRAINT store_stock_drilldown_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.store_stock_drilldown ADD CONSTRAINT store_stock_drilldown_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;


--changeset runal.pal@impactanalytics.co:store_stock_drilldown_structure_change stripComments:false splitStatements:false context:Release_1_2 labels:RLIS-367
--comment: added columns

ALTER TABLE inventory_smart.store_stock_drilldown ADD sales_1_ago float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD sales_2_ago float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD sales_3_ago float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD sales_4_ago float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD sales_5_ago float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD sales_6_ago float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD sales_7_ago float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD sales_8_ago float4 NULL;

CREATE INDEX store_stock_drilldown_product_code_idx ON inventory_smart.store_stock_drilldown (product_code,channel);

--changeset dushant.raut@impactanalytics.co:store_stock_drilldown_instock_col_added stripComments:false splitStatements:false context:RalphLauren labels:MTP-28244,MTP-33853
--comment: two columns added
ALTER TABLE inventory_smart.store_stock_drilldown ADD instock_pct float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD instock_pct_details float4 NULL;

--changeset saad.adeeb@impactanalytics.co:store_stock_drilldown_instock_prepack_handling stripComments:false splitStatements:false context:RalphLauren labels:MTP-29953
--comment: two columns added
ALTER TABLE inventory_smart.store_stock_drilldown ADD pack_type_id varchar NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD oh_packs int4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD oh_packs_in_eaches int4 NULL;

--changeset kuldeep.rathore@impactanalytics.co:Adding columns & indexes that are not in eu stripComments:false splitStatements:false context:Release_1_2 labels:RLIS-987
--comment: adding all the columns & indexes that are not in EU
CREATE INDEX IF NOT EXISTS store_stock_drilldown_sap_idx ON inventory_smart.store_stock_drilldown using hash (md5(store_code || '-' || article || '-' || product_code));
CREATE INDEX store_stock_drilldown_ap_idx ON inventory_smart.store_stock_drilldown USING hash (md5(((((article)::text) || '-'::text) || (product_code)::text))); 
ALTER TABLE inventory_smart.store_stock_drilldown ADD capped_demand float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD estimated_demand float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD min_constraints float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD max_constraints float4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD floorset_date date NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD financial_zone varchar NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD twos float4 NULL;

--changeset ishaan.singh@impactanalytics.co:store_stock_drilldown_two_new_cols stripComments:false splitStatements:false context:RalphLauren labels:MTP-2995
--comment: two new columns added
ALTER TABLE inventory_smart.store_stock_drilldown ADD dc_oh_packs int4 NULL;
ALTER TABLE inventory_smart.store_stock_drilldown ADD total_inventory int4 NULL;