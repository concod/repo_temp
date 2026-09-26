--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_kpi_master stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_kpi_master

CREATE TABLE IF NOT EXISTS oms.oms_alerts (
	article text NOT NULL,
	"size" text NOT NULL,
	product_code text NULL,
	vendor_code text NULL,
	loc_code text NOT NULL,
	channel text NULL,
	"style" varchar(256) NULL,
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
	historic_sales_unit int8 NULL,
	historic_sales_value float8 NULL,
	lost_sales_aggregated_unit int8 NULL,
	lost_sales_aggregated_value float8 NULL,
	potential_sales_unit int8 NULL,
	potential_sales_value float8 NULL,
	dc_wos_oh_oo_it int8 NULL,
	dc_store_wos_oh_oo_it int8 NULL,
	roq_unconstrained_earliest int8 NULL,
	raw_roq_earliest int8 NULL,
	order_quantity_earliest int8 NULL,
	receipt_date_earliest date NULL,
	order_placement_date_earliest date NULL,
	date_diff int8 NULL,
	CONSTRAINT pk_oms_alerts PRIMARY KEY (article, loc_code, size)
);


--changeset raja.duraisamy@impactanalytics.co:oms_alerts_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_alerts based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_alerts_product_loc ON oms.oms_alerts(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_alerts_article_loc ON oms.oms_alerts(article, loc_code);

--changeset raja.duraisamy@impactanalytics.co:index_oms_alerts_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_alerts
DROP INDEX IF EXISTS oms.idx_oms_alerts_product_loc;
DROP INDEX IF EXISTS oms.idx_oms_alerts_article_loc;
CREATE INDEX IF NOT EXISTS idx_oms_alerts_article_loc_product_code ON oms.oms_alerts(article, loc_code, product_code);

--changeset raja.duraisamy@impactanalytics.co:index_oms_alerts_drop_primary_key stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_alerts
ALTER TABLE oms.oms_alerts DROP CONSTRAINT pk_oms_alerts;
ALTER TABLE oms.oms_alerts ADD CONSTRAINT pk_oms_alerts PRIMARY KEY (article, "style", loc_code, channel, vendor_code, "size", product_code);