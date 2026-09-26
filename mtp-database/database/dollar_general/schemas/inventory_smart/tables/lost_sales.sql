--liquibase formatted sql
--changeset liquibase:lost_sales stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for lost_sales
CREATE TABLE inventory_smart.lost_sales (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	dma varchar NULL,
	vpro varchar NULL,
	fiscal_year_week int4 NOT NULL,
	oh float4 NULL,
	end_of_week_min float4 NULL,
	end_of_week_model_stock float4 NULL,
	actual_sales int4 NULL,
	lost_sales float4 NULL,
	lost_sales_to_model_stock_perc float4 NULL,
	CONSTRAINT lost_sales_pk PRIMARY KEY (product_code, store_code, fiscal_year_week)
)
PARTITION BY RANGE (fiscal_year_week);
ALTER TABLE inventory_smart.lost_sales ADD CONSTRAINT lost_sales_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.lost_sales ADD CONSTRAINT lost_sales_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;


--liquibase formatted sql
--changeset Swapnil.bhange@im:lost_sales stripComments:false splitStatements:false context:Release_1_0 labels:0050
--comment: Altered schema for lost_sales-2

ALTER table inventory_smart.lost_sales DROP COLUMN IF EXISTS dma ;
ALTER table inventory_smart.lost_sales DROP COLUMN IF EXISTS vpro ;
ALTER table inventory_smart.lost_sales DROP COLUMN IF EXISTS end_of_week_min;
ALTER table inventory_smart.lost_sales DROP COLUMN IF EXISTS lost_sales_to_model_stock_perc;
ALTER table inventory_smart.lost_sales DROP COLUMN IF EXISTS end_of_week_model_stock;

ALTER TAble inventory_smart.lost_sales RENAME COLUMN store_code TO psa_name;
ALTER TAble inventory_smart.lost_sales RENAME COLUMN lost_sales TO lost_sales_units;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN l0_code VARCHAR;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN l0_name VARCHAR;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN l1_name VARCHAR;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN l3_name VARCHAR;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN l4_name VARCHAR;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN primary_sku VARCHAR;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN product_description VARCHAR;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN cluster_avg_sales FLOAT4;

ALTER TABLE inventory_smart.lost_sales DROP CONSTRAINT IF EXISTS lost_sales_pk;
ALTER TABLE inventory_smart.lost_sales DROP CONSTRAINT IF EXISTS lost_sales_store_fk;

--liquibase formatted sql
--changeset Swapnil.bhange@:lost_sales stripComments:false splitStatements:false context:Release_1_0 labels:0049
--comment: Altered schema for lost_sales-3
ALTER TAble inventory_smart.lost_sales ADD COLUMN lost_sales_dollar float4;
--changeset laraib.ahmad-3:alerts_product_level_v3 stripComments:false splitStatements:false context:Release_1_0 labels:alerts-3
--comment: added two columns for alerts_product_level 
alter table inventory_smart.lost_sales add column if not exists fiscal_year int4 null;
alter table inventory_smart.lost_sales add column if not exists fiscal_week int4 null;
alter table inventory_smart.lost_sales add column if not exists selling_price float4 null;
alter table inventory_smart.lost_sales add column if not exists available_to_allocate int4 null;
--changeset laraib.ahmad:lost_sales stripComments:false splitStatements:false context:Release_1_0 labels:alerts-3
--comment: RENAME two columns for lost_sales
ALTER TABLE inventory_smart.lost_sales RENAME COLUMN oh TO opening_inventory;
ALTER TABLE inventory_smart.lost_sales RENAME COLUMN actual_sales TO units;
ALTER TABLE inventory_smart.lost_sales RENAME COLUMN lost_sales_units TO lost_units;
ALTER TABLE inventory_smart.lost_sales RENAME COLUMN lost_sales_dollar TO lost_sales;