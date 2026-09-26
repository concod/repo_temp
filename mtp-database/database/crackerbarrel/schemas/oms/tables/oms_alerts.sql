--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_kpi_master stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_kpi_master

CREATE TABLE IF NOT EXISTS inventory_smart.oms_alerts (
	article text NULL,
	"size" text NULL,
	product_code text NULL,
	vendor_code text NULL,
	loc_code text NULL,
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
	dc_store_wos_oh_oo_it int8 NULL
);

--changeset chandranil.ghosh@impactanalytics.co.co:make_schema_correct_cbocs_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_drop_notnull_constraint
--comment: changed drop_notnull_constraint
ALTER TABLE inventory_smart.oms_alerts ADD 	CONSTRAINT  pk_oms_alerts PRIMARY KEY (article, loc_code, size);

--changeset liquibase:zakia.firdous:oms_alerts_column_addition2 stripComments:false splitStatements:false context:MTP-17787 labels:MTP-86361
--comment: oms_alerts_column_addition2
alter table inventory_smart.oms_alerts add column if not exists roq_unconstrained_earliest int8 null;



--changeset bhargav.polavarapu:oms_alerts_column_addition_cb stripComments:false splitStatements:false context:Release_1_0 labels:adding_columns
--comment: oms_alerts_column_addition_cb
alter table inventory_smart.oms_alerts add column raw_roq_earliest int8 null;
alter table inventory_smart.oms_alerts add column order_quantity_earliest int8 null;
alter table inventory_smart.oms_alerts add column receipt_date_earliest date null;
alter table inventory_smart.oms_alerts add column order_placement_date_earliest date null;
alter table inventory_smart.oms_alerts add column date_diff int8 null;

