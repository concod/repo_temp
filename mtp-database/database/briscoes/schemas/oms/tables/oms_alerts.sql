--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_kpi_master stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_kpi_master

CREATE TABLE IF NOT EXISTS inventory_smart.oms_alerts (
	article text NULL,
	"size" text NULL,
	product_code text NULL,
	vendor_name text NULL,
	vendor_code text NULL,
	loc_code text NULL,
	channel text NULL,
	fiscal_year_month text NULL,
	fiscal_month_name text NULL,
	fiscal_year int8 NULL,
	store_forecast_pred float8 NULL,
	store_forecast_pred_cost float8 NULL,
	dc_forecast_pred_constrained float8 NULL,
	dc_forecast_pred_constrained_cost float8 NULL,
	dc_forecast_pred_unconstrained float8 NULL,
	dc_forecast_pred_unconstrained_cost float8 NULL,
	order_quantity int8 NULL,
	order_quantity_cost float8 NULL,
	raw_roq int8 NULL,
	raw_roq_cost float8 NULL,
	roq_constrained int8 NULL,
	roq_constrained_cost float8 NULL
);

--changeset samarjit.mazumder@impactanalytics.co.co:make_schema_correct_ stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_drop_notnull_constraint
--comment: changed drop_notnull_constraint
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS "style" varchar(50) NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS recom_receipt_date date NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS expedite_order bool NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS need_before_next_roq bool NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS recom_order bool NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS pending_order bool NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS is_expedite_order_resolved bool NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS is_need_before_next_roq_resolved bool NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS is_recom_order_resolved bool NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS is_pending_order_resolved bool NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS next_order_cycle_receipt_date date NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS historic_sales_unit int8 NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS	historic_sales_value float8 NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS	lost_sales_aggregated_unit int8 NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS	lost_sales_aggregated_value float8 NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS	potential_sales_unit int8 NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS	potential_sales_value float8 NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS	dc_wos_oh_oo_it int8 NULL;
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN IF NOT EXISTS	dc_store_wos_oh_oo_it int8 NULL;
ALTER TABLE inventory_smart.oms_alerts DROP CONSTRAINT IF EXISTS pk_oms_alerts;
ALTER TABLE inventory_smart.oms_alerts ADD 	CONSTRAINT  pk_oms_alerts PRIMARY KEY (article, loc_code, size);
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS fiscal_year_month ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	fiscal_month_name ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	fiscal_year ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	store_forecast_pred  ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	store_forecast_pred_cost ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	dc_forecast_pred_constrained ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	dc_forecast_pred_constrained_cost ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	dc_forecast_pred_unconstrained ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	dc_forecast_pred_unconstrained_cost ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	order_quantity ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	order_quantity_cost ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	raw_roq ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	raw_roq_cost ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	roq_constrained ;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	roq_constrained_cost; 
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS	roq_constrained_cost;
ALTER TABLE inventory_smart.oms_alerts DROP COLUMN IF EXISTS   vendor_name;

--changeset samarjit.mazumder@impactanalytics.co.co:alter_datatype_style_col stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_alter_datatype_style_col
--comment: changed alter_datatype_style_col
ALTER TABLE inventory_smart.oms_alerts ALTER COLUMN "style" TYPE VARCHAR(256);


--changeset samarjit.mazumder@impactanalytics.co.co:add_new_col1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:add_new_col1
--comment: changed add_new_col1
alter table inventory_smart.oms_alerts add column IF NOT EXISTS raw_roq_earliest int8 null;
alter table inventory_smart.oms_alerts add column IF NOT EXISTS order_quantity_earliest int8 null;
alter table inventory_smart.oms_alerts add column IF NOT EXISTS roq_unconstrained_earliest int8 null;
alter table inventory_smart.oms_alerts add column IF NOT EXISTS receipt_date_earliest date null;
alter table inventory_smart.oms_alerts add column IF NOT EXISTS order_placement_date_earliest date null;
alter table inventory_smart.oms_alerts add column IF NOT EXISTS date_diff int8 null;
