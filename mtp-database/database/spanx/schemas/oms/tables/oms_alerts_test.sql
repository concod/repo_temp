--liquibase formatted sql
--changeset liquibase:oms_alerts_test stripComments:false splitStatements:false context:initial_release labels:liquibase_project_startoms_alerts_test
--comment: initial changeset for oms_alerts_test

CREATE TABLE inventory_smart.oms_alerts_test (
	article varchar(50) NULL,
	l6_id varchar(50) NULL,
	product_code varchar NULL,
	loc_code varchar(50) NULL,
	channel varchar(50) NULL,
	vendor_code varchar(50) NULL,
	recom_receipt_date date NULL,
	next_order_cycle_date date NULL,
	expedite_order bool NULL,
	need_before_next_roq bool NULL,
	recom_order bool NULL,
	pending_order bool NULL,
	is_expedite_order_resolved bool NULL,
	is_need_before_next_roq_resolved bool NULL,
	is_recom_order_resolved bool NULL,
	is_pending_order_resolved bool NULL
);
