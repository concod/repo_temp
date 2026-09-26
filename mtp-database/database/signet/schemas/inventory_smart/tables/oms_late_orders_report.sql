--liquibase formatted sql
--changeset aman.lakkoju:oms_late_orders_report stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_late_orders_report


CREATE TABLE IF NOT EXISTS inventory_smart.oms_late_orders_report (
	id serial4 NOT NULL,
	product_code text NOT NULL,
	po_id text NOT NULL,
	order_date date NOT NULL,
	not_before_date date NOT NULL,
	not_after_date date NOT NULL,
	total_order_qty float8 NOT NULL,
	total_received_qty float8 NOT NULL,
	variance_unit float8 NOT NULL,
	four_week_open_qty float8 NOT NULL,
	total_order_qty_cost float8 NOT NULL,
	total_received_qty_cost float8 NOT NULL,
	variance_unit_cost float8 NOT NULL,
	four_week_open_qty_cost float8 NOT NULL,
	CONSTRAINT pk_oms_late_orders_report PRIMARY KEY (id)
);