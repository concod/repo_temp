--liquibase formatted sql
--changeset liquibase:new oms_alerts new schema  stripComments:false splitStatements:false context:new schema labels:schema change
--comment: new schema for oms_alerts

CREATE TABLE IF NOT EXISTS inventory_smart.oms_alerts (
	article varchar(50) NOT NULL,
	"style" varchar(50) NOT NULL,
	loc_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar NOT NULL,
	recom_receipt_date date NULL,
	expedite_order bool NULL,
	need_before_next_roq bool NULL,
	recom_order bool NULL,
	pending_order bool NULL,
	is_expedite_order_resolved bool NULL,
	is_need_before_next_roq_resolved bool NULL,
	is_recom_order_resolved bool NULL,
	is_pending_order_resolved bool NULL,
	next_order_cycle_receipt_date date NULL,
	"size" text NOT NULL,
	product_code text NOT NULL,
	historic_sales_unit int8 NULL,
	historic_sales_value float8 NULL,
	lost_sales_aggregated_unit int8 NULL,
	lost_sales_aggregated_value float8 NULL,
	potential_sales_unit int8 NULL,
	potential_sales_value float8 NULL,
	dc_wos_oh_oo_it int8 NULL,
	dc_store_wos_oh_oo_it int8 NULL,
	raw_roq_earliest int8 NULL,
	roq_unconstrained_earliest int8 NULL,
	receipt_date_earliest date NULL,
	order_placement_date_earliest date NULL,
	date_diff int8 NULL,
	order_quantity_earliest int8 NULL,
	CONSTRAINT pk_oms_alerts PRIMARY KEY (article, style, loc_code, channel, vendor_code, size, product_code)
);