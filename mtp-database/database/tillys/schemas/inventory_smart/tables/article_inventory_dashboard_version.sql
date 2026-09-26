--liquibase formatted sql
--changeset nischay.p@impactanalytics.co:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for article_inventory_dashboard

create  table if not exists inventory_smart.article_inventory_dashboard_version (
version_code int4 not null,
      article varchar not null,
  style_name varchar,
  store_code varchar not null,
  grade varchar,
  channel varchar,
  product_description varchar,
  oh FLOAT4,
  it FLOAT4,
  oo FLOAT4,
  tot_inv FLOAT4,
  lw_units int4,
  lw_revenue FLOAT4,
  lw_margin FLOAT4,
  lw_percentage FLOAT4,
  promo_percentage FLOAT4,
  average_discount FLOAT4,
  wos FLOAT4,
  wos_oh FLOAT4,
  wos_oh_it FLOAT4,
  dc_oh_oo_it_wos FLOAT4,
  dc_oh_wos FLOAT4,
  dc_oh_oo_wos FLOAT4,
  store_level_prediction FLOAT4,
  size_integrity FLOAT4,
  size_integrity_oh_it FLOAT4,
  size_integrity_oh_oo_it FLOAT4,
  excess int4,
  normal int4,
  shortfall int4,
  stockout int4,
  available_stores_percentage FLOAT4,
  week_to_date_sales int4,
  last_day_sales int4,
  oh_dc FLOAT4,
  oo_dc FLOAT4,
  dc_oo_po FLOAT4,
  it_dc FLOAT4,
  sales_1_ago int4,
  sales_2_ago int4,
  sales_3_ago int4,
  sales_4_ago int4,
  sales_5_ago int4,
  sales_6_ago int4,
  sales_7_ago int4,
  sales_8_ago int4,
  aur FLOAT4,
  sell_through_rate FLOAT4,
  style_color_status varchar,
  product_type varchar,
  in_stock_count FLOAT4,
  total_count FLOAT4,
  price FLOAT4,
  store_name varchar,
  l0_name varchar,
  l1_name varchar,
  l2_name varchar,
  l3_name varchar,
  ata FLOAT4,
  twos int4,
  po_comments varchar,
  ecom_po_quantity FLOAT4,
  ecom_po_flag int4,
  product_tag varchar GENERATED ALWAYS AS (
CASE
    WHEN stockout IS NOT NULL AND stockout::double precision <> 0::double precision THEN 'stockout'::text
    WHEN shortfall IS NOT NULL AND shortfall::double precision <> 0::double precision THEN 'shortfall'::text
    WHEN excess IS NOT NULL AND excess::double precision <> 0::double precision THEN 'excess'::text
    WHEN normal IS NOT NULL AND normal::double precision <> 0::double precision THEN 'normal'::text
    ELSE NULL::text
END) STORED NULL,
CONSTRAINT article_inventory_dashboard_version_pk PRIMARY KEY (version_code,article, store_code),
	CONSTRAINT article_inventory_dashboard_version_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE cascade,
CONSTRAINT article_inventory_dashboard_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
) partition by LIST (version_code);

--changeset nischay.p@impactanalytics.co:article_inventory_dashboard1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts1
--comment: initial changeset for article_inventory_dashboard1

ALTER TABLE "inventory_smart".article_inventory_dashboard_version 
RENAME COLUMN size_integrity TO si;

ALTER TABLE "inventory_smart".article_inventory_dashboard_version 
RENAME COLUMN size_integrity_oh_it TO si_oh_it;


ALTER TABLE "inventory_smart".article_inventory_dashboard_version 
RENAME COLUMN size_integrity_oh_oo_it TO si_oh_oo_it;

ALTER TABLE "inventory_smart".article_inventory_dashboard_version 
RENAME COLUMN lw_percentage TO lw_margin_percentage;

--changeset anish.a@impactanalytics.co:article_inventory_dashboard2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts2
--comment: initial changeset for article_inventory_dashboard2

ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD in_stock float4 NULL;

--changeset anish.a@impactanalytics.co:article_inventory_dashboard3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts2
--comment: initial changeset for article_inventory_dashboard3
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD dc_instock_percentage float4 NULL;

--changeset gauri.nair@impactanalytics.co:article_inventory_dashboard4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts4
--comment: initial changeset for article_inventory_dashboard4
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD reorder_flag varchar NULL;

--changeset anish.a@impactanalytics.co:article_inventory_dashboard5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts2
--comment: initial changeset for article_inventory_dashboard5
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD color_id_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD style_color_desc varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD silhouette varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD price_status varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD brand varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD vendor varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD "comments" varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD product_status varchar NULL;

--changeset anish.a@impactanalytics.co:article_inventory_dashboard6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts2
--comment: initial changeset for article_inventory_dashboard6
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD city varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD state varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD store_category varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD geo_region varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD channel_id_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD region_id_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD district_id_name varchar NULL;


--changeset anish.a@impactanalytics.co:article_inventory_dashboard6_add_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts2
--comment: initial changeset for article_inventory_dashboard6_
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD l4_name varchar NULL;

--changeset gauri.nair@impactanalytics.co:article_inventory_dashboard7_add_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts7
--comment: initial changeset for article_inventory_dashboard7_
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD launch_date date NULL;

