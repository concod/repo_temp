--liquibase formatted sql
--changeset liquibase:raja.duraisamy:oms_alerts_sku_loc_update stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_alerts_sku_loc_table
CREATE TABLE IF NOT EXISTS inventory_smart.oms_alerts_sku_loc (
	id bigserial PRIMARY KEY,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	recom_receipt_date date NULL,
	expedite_order bool NULL DEFAULT false,
	need_before_next_roq bool NULL DEFAULT false,
	is_expedite_order_resolved bool NULL DEFAULT false,
	is_need_before_next_roq_resolved bool NULL DEFAULT false,
	next_order_cycle_date date NULL,
	initial_program_sku_flag bool NULL DEFAULT false,
	is_initial_program_sku_flag bool NULL DEFAULT false,
	CONSTRAINT uk_oms_alerts_sku_loc UNIQUE (product_code, loc_code)
);