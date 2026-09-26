--liquibase formatted sql
--changeset liquibase:oms_alerts_sku_loc stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_alerts_sku_loc 

CREATE TABLE inventory_smart.oms_alerts_sku_loc (
	id bigserial NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	recom_receipt_date date NULL,
	expedite_order bool DEFAULT false NULL,
	need_before_next_roq bool DEFAULT false NULL,
	is_expedite_order_resolved bool DEFAULT false NULL,
	is_need_before_next_roq_resolved bool DEFAULT false NULL,
	next_order_cycle_date date NULL,
	initial_program_sku_flag bool DEFAULT false NULL,
	is_initial_program_sku_flag bool DEFAULT false NULL,
	CONSTRAINT uk_oms_alerts_sku_loc UNIQUE (product_code, loc_code)
);

