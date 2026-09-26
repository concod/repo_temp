--liquibase formatted sql
--changeset liquibase:model_stock_deep_dive stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for model_stock_deep_dive
CREATE TABLE inventory_smart.model_stock_deep_dive (
	store_code varchar NOT NULL,
	product_code varchar NOT NULL,
	fiscal_year_week int4 NOT NULL,
	dma varchar NULL,
	vpro varchar NULL,
	sub_sku_division varchar NULL,
	store_avail_oh_actuals float4 NULL,
	store_avail_it_actuals float4 NULL,
	model_stock float4 NULL,
	predicted_qty float4 NULL,
	adjusted_forecast_qty float4 NULL,
	min float4 NULL,
	max float4 NULL,
	wos float4 NULL,
	constrained_flag int4 NULL,
	sales int4 NULL,
	model_stock_minus_min_stock float4 NULL,
	adjusted_forecast_qty_minus_max_stock float4 NULL,
	current_in_stock_percentage float4 NULL,
	CONSTRAINT model_stock_deep_dive_pk PRIMARY KEY (fiscal_year_week, product_code, store_code)
)
PARTITION BY RANGE (fiscal_year_week);
ALTER TABLE inventory_smart.model_stock_deep_dive ADD CONSTRAINT model_stock_deep_dive_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.model_stock_deep_dive ADD CONSTRAINT model_stock_deep_dive_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
/*
do $$
declare 
partition_stmt varchar;
begin
	for partition_stmt in 
select
	'create table inventory_smart.model_stock_deep_dive_' || from_fiscal_year_week || ' partition of inventory_smart.model_stock_deep_dive for values from  (' || from_fiscal_year_week || ') to (' || to_fiscal_year_week || ');'
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
*/


--changeset saumya.agnihotri@impactanalytics.co:model_stock_deep_dive stripComments:false splitStatements:false context:MTP-18041 labels:original_ia_forecast_coll_add
--comment: column addition original_ia_forecast

ALTER TABLE inventory_smart.model_stock_deep_dive ADD COLUMN original_ia_forecast float4 ;


--changeset ashish@impactanalytics.co:model_stock_deep_dive stripComments:false splitStatements:false context:Req_BY_Saumya labels:6_cols_add
--comment: 6 columns addition
alter table inventory_smart.model_stock_deep_dive add column store_group varchar;
alter table inventory_smart.model_stock_deep_dive add column dotcom_exclusive varchar;
alter table inventory_smart.model_stock_deep_dive add column dc_avail_oh int4;
alter table inventory_smart.model_stock_deep_dive add column inprogress_allocations float8;
alter table inventory_smart.model_stock_deep_dive add column vendor_name varchar;
alter table inventory_smart.model_stock_deep_dive add column merchandise_category varchar;

--changeset saumya.agnihotri@impactanalytics.co:model_stock_deep_dive_column_altering stripComments:false splitStatements:false context:column addition (SP-11) labels:1_cols_add
--comment: 1 columns addition & 1 column datatype change
ALTER TABLE inventory_smart.model_stock_deep_dive ADD sku_current_in_stock_percentage float4 NULL;
ALTER TABLE inventory_smart.model_stock_deep_dive ALTER COLUMN constrained_flag TYPE varchar USING constrained_flag::varchar;
