--liquibase formatted sql
--changeset liquibase:oms_alerts_sku_loc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_alerts_sku_loc
CREATE TABLE inventory_smart.oms_alerts_sku_loc (
	id bigserial NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	recom_receipt_date date NULL,
	expedite_order bool NULL DEFAULT false,
	need_before_next_roq bool NULL DEFAULT false,
	is_expedite_order_resolved bool NULL DEFAULT false,
	is_need_before_next_roq_resolved bool NULL DEFAULT false,
	next_order_cycle_date date NULL,
	CONSTRAINT uk_oms_alerts_sku_loc UNIQUE (product_code, loc_code)
);

--changeset kishan.patel:oms_alerts_sku_loc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_alerts_sku_loc

ALTER TABLE inventory_smart.oms_alerts_sku_loc ADD COLUMN IF NOT EXISTS initial_program_sku_flag bool NULL DEFAULT false;
ALTER TABLE inventory_smart.oms_alerts_sku_loc ADD COLUMN IF NOT EXISTS is_initial_program_sku_flag bool NULL DEFAULT false;