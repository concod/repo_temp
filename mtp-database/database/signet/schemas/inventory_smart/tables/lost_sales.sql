--liquibase formatted sql
--changeset liquibase:lost_sales_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for lost_sales
CREATE TABLE IF NOT EXISTS inventory_smart.lost_sales (
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
ALTER TABLE inventory_smart.lost_sales DROP CONSTRAINT IF EXISTS lost_sales_product_fk;
ALTER TABLE inventory_smart.lost_sales DROP CONSTRAINT IF EXISTS lost_sales_store_fk;
ALTER TABLE inventory_smart.lost_sales ADD CONSTRAINT lost_sales_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.lost_sales ADD CONSTRAINT lost_sales_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
/*
do $$
declare 
partition_stmt varchar;
begin
	for partition_stmt in 
select
	'create table inventory_smart.lost_sales_' || from_fiscal_year_week || ' partition of inventory_smart.lost_sales for values from  (' || from_fiscal_year_week || ') to (' || to_fiscal_year_week || ');'
from
	(
	select
		distinct fiscal_year_week from_fiscal_year_week,
		fiscal_year_week + 1 to_fiscal_year_week
	from
		global.fiscal_date_mapping fdm
	where
		fdm."date" > '31-Jan-2018'
	order by
		1
	limit 520) x
loop 
	execute partition_stmt;
end loop;
end $$;
*/


--changeset saumya,agnihotri:lost_sales_2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23523
--comment: adding product and store attributes to lost sales report
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS product_channel_name varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS vendor_code varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS product_type varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS merchandise_category varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS merchandise_brand varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS planning_ownership varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS production_method varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS dotcom_exclusive varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS metal_color varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS metal_type varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS channel varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS combo_store varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS district varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS shop_in_shop varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS state varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS brand varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS store_name varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS product_description varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS l0_name varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS l1_name varchar NULL;
ALTER TABLE inventory_smart.lost_sales ADD COLUMN IF NOT EXISTS l2_name varchar NULL;


--changeset saumya.agnihotri:lost_sales_3 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23523
--comment: adding region to lost sales report - 2
ALTER TABLE inventory_smart.lost_sales ADD IF NOT EXISTS region varchar NULL;