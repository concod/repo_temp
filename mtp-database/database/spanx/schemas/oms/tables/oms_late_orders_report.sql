--liquibase formatted sql
--changeset liquibase:oms_late_orders_report stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_late_orders_report 

CREATE TABLE IF NOT EXISTS inventory_smart.oms_late_orders_report (
	vendor_code varchar NOT NULL,
	vendor_name varchar NULL,
	po_id varchar NOT NULL,
	product_code varchar NOT NULL,
	"style" varchar NOT NULL,
	article varchar NOT NULL,
	"size" varchar NOT NULL,
	channel varchar NOT NULL,
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
	CONSTRAINT pk_oms_late_orders_report PRIMARY KEY (vendor_code, po_id, style, article, size, product_code, loc_code, channel)
);
