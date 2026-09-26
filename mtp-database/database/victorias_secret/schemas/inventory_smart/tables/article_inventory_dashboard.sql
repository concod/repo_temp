--liquibase formatted sql
--changeset liquibase:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_inventory_dashboard
CREATE TABLE inventory_smart.article_inventory_dashboard (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	oh int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	store_level_prediction float4 NULL,
	oh_dc int4 NULL,
	shortfall int4 NULL,
	normal int4 NULL,
	excess int4 NULL,
	wos float4 NULL,
	lw_qty int4 NULL,
	promo_percentage float4 NULL,
	stockout int4 NULL,
	tot_inv float4 NULL,
	si float4 NULL,
	available_stores_percentage float4 NULL,
	week_to_date_sales int4 NULL,
	last_day_sales int4 NULL,
	top_25_percent float4 NULL,
	oo_dc float4 NULL,
	it_dc float4 NULL,
	channel varchar NOT NULL,
	lw_margin_percentage float4 NULL,
	sales_1_ago float4 NULL,
	sales_2_ago float4 NULL,
	sales_3_ago float4 NULL,
	sales_4_ago float4 NULL,
	sales_5_ago float4 NULL,
	sales_6_ago float4 NULL,
	sales_7_ago float4 NULL,
	sales_8_ago float4 NULL,
	CONSTRAINT article_inventory_dashboard_un UNIQUE (article, store_code, channel)
);
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
CREATE INDEX article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);
CREATE INDEX article_inventory_dashboard_store_code_idx ON inventory_smart.article_inventory_dashboard USING btree (store_code);

--changeset saad_adeeb:article_inventory_dashboard stripComments:false splitStatements:false context:VS_InventorySmart labels:MTP-18915
--comment: Added 8 new columns
ALTER TABLE inventory_smart.article_inventory_dashboard ADD aur float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD sales_pen_pct float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD sales_build float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD sell_through_rate float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD inv_pen_pct float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD stock_to_sales_ratio float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD weeks_oh float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD inv_build float4 NULL;


--changeset jagadeesh_pondara:article_inventory_dashboard stripComments:false splitStatements:false context:VS_InventorySmart labels:MTP-24427
--comment: Added 1 new column

ALTER TABLE inventory_smart.article_inventory_dashboard ADD style_color_status varchar NULL;

--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_updated stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-310
--comment: Schema Modified as per VS requirement
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN lw_qty TYPE float4 USING lw_qty::float4;
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN stockout TYPE float4 USING stockout::float4;
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN week_to_date_sales TYPE float4 USING week_to_date_sales::float4;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN article TO choice;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN sales_4_ago TO last_4_week_sales;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN sales_8_ago TO last_8_week_sales;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN style_color_status TO choice_status;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN lw_qty TO last_week_sales;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN lw_margin TO last_week_margin;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN lw_revenue TO last_week_revenue;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN lw_margin_percentage TO last_week_margin_percentage;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN wos TO forward_wos;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN store_level_prediction;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN si;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN available_stores_percentage;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN last_day_sales;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN top_25_percent;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN channel;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sales_1_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sales_2_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sales_3_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sales_5_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sales_6_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sales_7_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sales_pen_pct;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sales_build ;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN sell_through_rate;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN inv_pen_pct ;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN stock_to_sales_ratio;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN weeks_oh ;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN inv_build;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD size_integrity_oh float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD size_integrity_oh_oo_it float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD ph_code int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD rfid_delta int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD rfid_store_oh int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD initial_oh int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD store_reserve int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_pk PRIMARY KEY (choice,store_code,ph_code);
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_ph_code_fk FOREIGN KEY (ph_code)  REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE CASCADE;
CREATE INDEX article_inventory_dashboard_ph_code_idx ON inventory_smart.article_inventory_dashboard USING btree (ph_code);
ALTER TABLE inventory_smart.article_inventory_dashboard ADD forecast_over_target_wos float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD choice_description varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD color varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD store_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD region int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD country varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD district varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD city varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD brand varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD category varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD merchandise_category varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD subclass varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD "style" varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD flex_style varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD generic varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD sizes varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD form varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD user_defined_1 varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD user_defined_2 varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD user_defined_3 varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD user_defined_4 varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD user_defined_5 varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD user_defined_6 varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD l4w_avg_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD l8w_avg_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD week_count_l4w int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD week_count_l8w int4 NULL;


--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_v2 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-321
--comment: Adding new columns and renamed rfid_oh as per requirement
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD wip int4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD store_tier varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN rfid_store_oh TO epc_units;


--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-319
--comment: Renaming sizes column to sizes_mat
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN sizes to sizes_mat;


--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_v4 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-336
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.article_inventory_dashboard DROP CONSTRAINT article_inventory_dashboard_pk ;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP CONSTRAINT article_inventory_dashboard_ph_code_fk ;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN ph_code ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN choice TO article ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN choice_description TO l6_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN country to s1_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN district TO s3_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN city TO s4_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN brand TO l0_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN category TO l2_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN merchandise_category TO l3_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN subclass TO l4_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN "style" TO l5_name ;
ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN region TO location_hierarchy_region_code ;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD CONSTRAINT article_inventory_dashboard_pk PRIMARY KEY (article,store_code);


--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_v5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding hierarchies and attributes based on requirement
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD "collection"  varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD masterstyle_descr  varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD subbrand_code_desc  varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD product_lifecycle varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD current_floorset varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD current_assortment_group varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_v6 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-161
--comment: adding forecast metrics as per SSD & AID sync up
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD current_week_forecast float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD next_4_week_forecast float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD next_8_week_forecast float4 NULL;


--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_v7 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: adding channel based on req
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS channel varchar NULL;


--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_v8 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Typecasted the region column 
ALTER TABLE inventory_smart.article_inventory_dashboard ALTER COLUMN location_hierarchy_region_code TYPE text USING location_hierarchy_region_code::text;


--changeset kamuju.mahaveer@impactanalytics.co:article_inventory_dashboard_enhancement stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-835
--comment: Added the required new columns 
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS twos float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l1w_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l2w_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l3w_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l4w_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l5w_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l6w_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l7w_sales float4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard  ADD COLUMN IF NOT EXISTS l8w_sales float4 NULL;

--changeset shinde.samarth@impactanalytics.co:article_inventory_dashboard_enhancement_v1 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-835
--comment: Added the required new columns
-- ...existing code...
ALTER TABLE inventory_smart.article_inventory_dashboard
ADD COLUMN IF NOT EXISTS total_store_dc_inv float4 NULL;

-- changeset imran.khan@impactanalytics.co:article_inventory_dashboard_product_tag stripComments:false splitStatements:false context:db_sync labels:added product_tag column
-- comment: added product_tag column
ALTER TABLE inventory_smart.article_inventory_dashboard ADD product_tag varchar GENERATED ALWAYS AS (
CASE
    WHEN stockout IS NOT NULL AND stockout <> 0::double precision THEN 'stockout'::text
    WHEN shortfall IS NOT NULL AND shortfall <> 0::double precision THEN 'shortfall'::text
    WHEN excess IS NOT NULL AND excess <> 0::double precision THEN 'excess'::text
    WHEN normal IS NOT NULL AND normal <> 0::double precision THEN 'normal'::text
    ELSE NULL::text
END) STORED NULL;