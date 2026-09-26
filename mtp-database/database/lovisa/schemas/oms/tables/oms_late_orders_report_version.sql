--liquibase formatted sql
--changeset swapnil.bhange-2:oms_late_orders_report_version_v stripComments:false splitStatements:false context:Release_1_0 labels:oms_late_orders_report_version
--comment: initial changeset for oms_late_orders_report_version_v1

CREATE TABLE IF NOT EXISTS inventory_smart.oms_late_orders_report_version (
	version_code int4 NOT NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	po_id varchar NOT NULL,
	product_code varchar NOT NULL,
	"style" varchar NOT NULL,
	article varchar NOT NULL,
	"size" varchar NOT NULL,
	channel varchar NULL,
	loc_code varchar NOT NULL,
	order_date date NULL,
	projected_delivery_date date NULL,
	dc_oh int4 NULL,
	total_order_qty int4 NULL,
	total_order_cost float8 NULL,
	total_received_qty int4 NULL,
	total_received_cost float8 NULL,
	late_order_qty int4 NULL,
	late_order_cost float8 NULL,
	order_qty_four_weeks int4 NULL,
	order_cost_four_weeks float8 NULL,
	CONSTRAINT pk_oms_late_orders_report PRIMARY KEY (version_code, po_id, style, article, size, product_code, loc_code)
) PARTITION BY LIST (version_code);
