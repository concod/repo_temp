--liquibase formatted sql
--changeset swapnil.bhange:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_inventory_dashboard
CREATE TABLE inventory_smart.article_inventory_dashboard_version (
  version_code INT4 NOT NULL,
  article VARCHAR NOT NULL,
  store_code VARCHAR NOT NULL,
  l0_name VARCHAR NOT NULL,
  l1_name VARCHAR NULL,
  l2_name VARCHAR NULL,
  l3_name VARCHAR NULL,
  l4_name VARCHAR NULL,
  channel VARCHAR NULL,
  product_description VARCHAR NULL,
  oh FLOAT4 NULL,
  it FLOAT4 NULL,
  oo FLOAT4 NULL,
  total_inv INT8 NULL,
  lw_units INT8 NULL,
  lw_revenue FLOAT4 NULL,
  lw_margin FLOAT4 NULL,
  promo_percentage FLOAT4 NULL,
  dos FLOAT4 NULL,
  dos_oh FLOAT4 NULL,
  dos_oh_it FLOAT4 NULL,
  dc_oh_oo_it_dos FLOAT4 NULL,
  dc_oh_dos FLOAT4 NULL,
  dc_oh_oo_dos FLOAT4 NULL,
  store_level_prediction FLOAT4 NULL,
  size_integrity FLOAT4 NULL,
  size_integrity_oh_it FLOAT4 NULL,
  size_integrity_oh_oo_it FLOAT4 NULL,
  excess INT8 NULL,
  normal INT8 NULL,
  shortfall INT8 NULL,
  stockout INT8 NULL,
  available_stores_percentage FLOAT4 NULL,
  week_to_date_sales INT8 NULL,
  last_day_sales INT8 NULL,
  oh_dc FLOAT4 NULL,
  oo_dc FLOAT4 NULL,
  dc_oo_po INT8 NULL,
  it_dc FLOAT4 NULL,
  sales_1_ago INT8 NULL,
  sales_2_ago INT8 NULL,
  sales_3_ago INT8 NULL,
  sales_4_ago INT8 NULL,
  aur FLOAT4 NULL,
  sell_through_rate FLOAT4 NULL,
  style_color_status VARCHAR NULL,
  product_type VARCHAR NULL,
  in_stock_count FLOAT4 NULL,
  total_count FLOAT4 NULL,
  last_allcated DATE NULL,
  CONSTRAINT article_inventory_dashboard_version_un UNIQUE (version_code, article, store_code)
)
PARTITION BY LIST (version_code);

-- inventory_smart.article_inventory_dashboard_version foreign keys

ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD CONSTRAINT article_inventory_dashboard_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD CONSTRAINT article_inventory_dashboard_version_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset swapnil.bhange-3:article_inventory_dashboard_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding display_article column in article_inventory_dashboard_v3
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS display_article varchar NULL;

--changeset swapnil.bhange-4:article_inventory_dashboard_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding forecast columns column in article_inventory_dashboard_v4
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS forecast_1_ago float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS forecast_2_ago float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS forecast_3_ago float8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS forecast_4_ago float8 NULL;

--changeset sreenivas.s-5:article_inventory_dashboard_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in article_inventory_dashboard_v5
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS style_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS range_name varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS special_classification varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS l4w_units float4 NULL;

--changeset sreenivas.s-5:article_inventory_dashboard_v6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in article_inventory_dashboard_v6
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS store_name varchar NULL;

--changeset swapnil.b-5:article_inventory_dashboard_v7 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing datatype of columns in article_inventory_dashboard_v7
ALTER TABLE inventory_smart.article_inventory_dashboard_version ALTER COLUMN excess TYPE float4 USING excess::float4;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ALTER COLUMN in_stock_count TYPE float4 USING in_stock_count::int4;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ALTER COLUMN lw_units TYPE float4 USING lw_units::float4;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ALTER COLUMN normal TYPE float4 USING normal::float4;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ALTER COLUMN shortfall TYPE float4 USING shortfall::float4;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ALTER COLUMN stockout TYPE float4 USING stockout::float4;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ALTER COLUMN total_count TYPE float4 USING total_count::int4;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ALTER COLUMN total_inv TYPE float4 USING total_inv::float4;

--changeset swapnil.b-6:article_inventory_dashboard_v8 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in article_inventory_dashboard_v8
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS wip FLOAT4  NULL;

--changeset swapnil.b-6:article_inventory_dashboard_v9 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in article_inventory_dashboard_v9
alter table inventory_smart.article_inventory_dashboard_version rename column lw_units to last_week_sales;
alter table inventory_smart.article_inventory_dashboard_version rename column lw_revenue to last_week_revenue;

--changeset swapnil.b-6:article_inventory_dashboard_v10 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in article_inventory_dashboard_v10
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS average_discount FLOAT4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS sales_5_ago int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS sales_6_ago int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS sales_7_ago int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS sales_8_ago int8 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS grade varchar NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS price INT4 NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS lw_margin_percentage FLOAT4 NULL;
	
--changeset swapnil.b-6:article_inventory_dashboard_v11 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in article_inventory_dashboard_v11
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS tdos FLOAT4 NULL;

--changeset swapnil.b-6:article_inventory_dashboard_v12 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in article_inventory_dashboard_v12
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS launch_date DATE NULL;
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS s1_name VARCHAR NULL;

--changeset swapnil.b-6:article_inventory_dashboard_v13 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in article_inventory_dashboard_v13
ALTER TABLE inventory_smart.article_inventory_dashboard_version ADD COLUMN IF NOT EXISTS s0_name VARCHAR NULL;

--changeset linu.nazil:article_inventory_dashboard_version_index stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding index on article in article_inventory_dashboard_version
CREATE INDEX IF NOT EXISTS article_inventory_dashboard_version_article_idx ON inventory_smart.article_inventory_dashboard_version USING btree (article);