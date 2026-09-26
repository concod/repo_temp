--liquibase formatted sql
--changeset swapnil.bhange:oms_alerts stripComments:false splitStatements:false context:Release_1_0 labels:oms_alerts
--comment: initial changeset for oms_alerts

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
	product_code text NULL,
	historic_sales_unit int8 NULL,
	historic_sales_value float8 NULL,
	lost_sales_aggregated_unit int8 NULL,
	lost_sales_aggregated_value float8 NULL,
	potential_sales_unit int8 NULL,
	potential_sales_value float8 NULL,
	dc_wos_oh_oo_it int8 NULL,
	dc_store_wos_oh_oo_it int8 NULL,
	raw_roq_earliest int8 NULL,
	order_quantity_earliest int8 NULL,
	receipt_date_earliest date NULL,
	order_placement_date_earliest date NULL,
	date_diff int8 NULL,
	roq_unconstrained_earliest int8 NULL,
	CONSTRAINT pk_oms_alerts PRIMARY KEY (article, style, loc_code, channel, vendor_code, size)
);

--changeset sreenivas.s@impactanalytics.co:oms_alerts_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_alerts_v1
alter table inventory_smart.oms_alerts DROP column if exists order_quantity_earliest;
ALTER TABLE inventory_smart.oms_alerts ALTER COLUMN style TYPE varchar(250);

--changeset sreenivas.s@impactanalytics.co:oms_alerts_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_alerts_v2
ALTER TABLE inventory_smart.oms_alerts ADD COLUMN if not exists order_quantity_earliest int8 NULL;

--changeset chandranil.ghosh@impactanalytics.co:created_lovisa_alert_indexes_v1 stripComments:false splitStatements:false context:Release_1_0 labels:data_type_updates_1
--comment: created lovisa alert indexes
-- Expedite orders
-- CONSOLIDATED: Single index covering all alert types and resolved flags
CREATE INDEX IF NOT EXISTS idx_oa_article_loc_prod_flags
  ON inventory_smart.oms_alerts (article, loc_code, product_code, expedite_order, recom_order, need_before_next_roq, is_expedite_order_resolved, is_recom_order_resolved, is_need_before_next_roq_resolved);

--changeset raja.duraisamy:idx_oms_alerts_article_loc_product_code runOnChange:false stripComments:false splitStatements:false context:PERFORMANCE_OPTIMIZATION labels:oms_alerts
--comment: PERFORMANCE OPTIMIZATION - Create index on oms_alerts for article, loc_code, product_code
CREATE INDEX IF NOT EXISTS idx_oms_alerts_article_loc_product_code
ON inventory_smart.oms_alerts (article, loc_code, product_code);