--liquibase formatted sql
--changeset liquibase:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_inventory_dashboard

CREATE TABLE IF NOT EXISTS inventory_smart.article_inventory_dashboard (
	article text NULL,
	store_code text NULL,
	channel text NULL,
	product_description text NULL,
	oh float8 NULL,
	it float8 NULL,
	oo float8 NULL,
	tot_inv float8 NULL,
	lw_units float8 NULL,
	lw_revenue float8 NULL,
	lw_margin float8 NULL,
	promo_percentage float8 NULL,
	wos float8 NULL,
	store_level_prediction float8 NULL,
	size_integrity float8 NULL,
	excess int8 NULL,
	normal int8 NULL,
	shortfall int8 NULL,
	stockout int8 NULL,
	available_stores_percentage float8 NULL,
	week_to_date_sales float8 NULL,
	last_day_sales float8 NULL,
	oh_dc float8 NULL,
	oo_dc float8 NULL,
	dc_oo_po float8 NULL,
	it_dc float8 NULL,
	sales_1_ago float8 NULL,
	sales_2_ago float8 NULL,
	sales_3_ago float8 NULL,
	sales_4_ago float8 NULL,
	sales_5_ago float8 NULL,
	sales_6_ago float8 NULL,
	sales_7_ago float8 NULL,
	sales_8_ago float8 NULL,
	aur float8 NULL,
	sell_through_rate float8 NULL,
	style_color_status text NULL,
	CONSTRAINT article_inventory_dashboard_store_uk UNIQUE (article, store_code),
	CONSTRAINT article_inventory_dashboard_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset aman.lakkoju:updated article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:cols_add
--comment: updated article_inventory_dashboard
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS total_count int;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock int;


--changeset kaustubh.gupta:columns_addition_article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_2
--comment: added hierarchy columns
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l0_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l0_id varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l1_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l1_id varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l2_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l2_id varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS primary_trait_id varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l3_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l3_id varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l4_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l4_id varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l5_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l5_id varchar NULL;

--changeset kaustubh.gupta:columns_addition_wos stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_3
--comment: added wos columns
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS wos_oh float;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS wos_oh_oo float;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS wos_oh_oo_it float;

--changeset aman.lakkoju:Added_and_removed_some_columns stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_3
--comment: Added and removed some columns
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS style varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS style_description varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS product_type varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS item_status varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS launch_date varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS clearance boolean NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS clearance_start_date date NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS store_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS store_tier varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS price float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS msrp float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l4w_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l4w_revenue float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l8w_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS l6m_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS discount float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS wos_oh_it float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_wos_oh_oo_it float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_wos_oh_oo float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_wos_oh float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS sell_through_perc float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS ata_eaches float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS ata_packs float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS ata float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_oo float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock_count int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_instock_count int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_instock_total_count int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock_dc_ata_count int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock_dc_ata_total_count int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS in_stock_ata float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS allocated_units int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS primary_trait_desc varchar NULL;


ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS product_description;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS promo_percentage;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS wos;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS store_level_prediction;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS size_integrity;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS available_stores_percentage;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS week_to_date_sales;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS last_day_sales;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS oh_dc;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS oo_dc;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS dc_oo_po;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS it_dc;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sales_1_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sales_2_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sales_3_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sales_4_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sales_5_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sales_6_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sales_7_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sales_8_ago;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS aur;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS sell_through_rate;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS style_color_status;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS l0_id;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS l1_id;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS l2_id;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS l3_id;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS l4_id;
ALTER TABLE inventory_smart.article_inventory_dashboard DROP COLUMN IF EXISTS l5_id;

ALTER TABLE inventory_smart.article_inventory_dashboard RENAME COLUMN tot_inv TO total_inv;

--changeset aman_lakkoju:dc_instock column added stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_3
--comment: dc_instock column added
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_instock float8 NULL;

--changeset kaustubh_gupta:cols_add_cols_rename stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_rename_4
--comment: cols added and renamed
alter table inventory_smart.article_inventory_dashboard 
add column if not exists promo_percentage float;

alter table inventory_smart.article_inventory_dashboard 
add column if not exists oh_dc float;

alter table inventory_smart.article_inventory_dashboard 
add column if not exists it_dc float;

alter table inventory_smart.article_inventory_dashboard 
rename column total_inv to tot_inv;

alter table inventory_smart.article_inventory_dashboard 
rename column dc_oo to oo_dc;

--changeset aman.lakkoju:added instock perc columns stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_rename_4
--comment: added instock perc columns

ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS instock_perc float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS dc_instock_perc float8 NULL;

--changeset aman_lakkoju:adding_wtd_units_columns stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_rename_4
--comment: adding_wtd_units_columns

ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS wtd_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS w2_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS w3_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS w4_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS w5_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS w6_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS w7_units float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS w8_units float8 NULL;

--changeset aman.lakkoju:adding_twos stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_rename_4
--comment: adding_twos

ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS twos float8 NULL;

--changeset aman_lakkoju_:added_article_alert_flag stripComments:false splitStatements:false context:Release_1_0 labels:cols_add_rename_4
--comment: added_article_alert_flag

ALTER TABLE inventory_smart.article_inventory_dashboard ADD COLUMN IF NOT EXISTS article_alert_flag varchar NULL;

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

--changeset surendra.babu@impactanalytics.co:article_inventory_dashboard_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:aid_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS article_inventory_dashboard_article_idx ON inventory_smart.article_inventory_dashboard USING btree (article);