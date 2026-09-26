--liquibase formatted sql
--changeset liquibase:oms_alerts_store stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_alerts_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_alerts_store (
	article varchar(50) NOT NULL,
	"style" varchar(256) NULL,
	store_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar NULL,
	recom_receipt_date date NULL,
	expedite_order bool NULL,
	need_before_next_roq bool NULL,
	recom_order bool NULL,
	is_expedite_order_resolved bool NULL,
	is_need_before_next_roq_resolved bool NULL,
	is_recom_order_resolved bool NULL,
	next_order_cycle_receipt_date date NULL,
	"size" text NOT NULL,
	product_code text NULL,
	historic_sales_unit int8 NULL,
	historic_sales_value float8 NULL,
	lost_sales_aggregated_unit int8 NULL,
	lost_sales_aggregated_value float8 NULL,
	potential_sales_unit int8 NULL,
	potential_sales_value float8 NULL,
	raw_roq_earliest int8 NULL,
	order_quantity_earliest int8 NULL,
	roq_unconstrained_earliest int8 NULL,
	receipt_date_earliest date NULL,
	order_placement_date_earliest date NULL,
	date_diff int8 NULL,
	CONSTRAINT pk_oms_alerts_store PRIMARY KEY (article, store_code, size)
);

--changeset kanishka.parashar@impactanalytics.co:drop_not_null_constraint stripComments:false splitStatements:false context:Release_1_0 labels:drop_not_null_constraint
--comment: pending_orders_column
ALTER TABLE inventory_smart.oms_constraints_status ADD COLUMN pending_order bool NULL;
ALTER TABLE inventory_smart.oms_constraints_status ADD COLUMN is_pending_order_resolved bool NULL;

--changeset kanishka.parashar@impactanalytics.co:adding column_1 stripComments:false splitStatements:false context:Release_1_0 labels:drop_not_null_constraint
--comment: pending_orders_column_1
ALTER TABLE inventory_smart.oms_constraints_status drop COLUMN if exists pending_order;
ALTER TABLE inventory_smart.oms_constraints_status drop COLUMN if exists is_pending_order_resolved;
ALTER TABLE inventory_smart.oms_alerts_store ADD COLUMN pending_order bool NULL;
ALTER TABLE inventory_smart.oms_alerts_store ADD COLUMN is_pending_order_resolved bool NULL;
