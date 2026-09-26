--liquibase formatted sql
--changeset liquibase:oms_alerts2 stripComments:false splitStatements:false context:Release_1_0 labels:oms_alerts2
--comment: oms_alerts_table 
CREATE TABLE IF NOT EXISTS inventory_smart.oms_alerts (
	article varchar(50) NOT NULL,
	"style" varchar(50) NULL,
	loc_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar NULL,
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
	CONSTRAINT pk_oms_alerts PRIMARY KEY (article, loc_code, size)
);

--changeset liquibase:kanishka.parashar:oms_alerts_column_addition stripComments:false splitStatements:false context:MTP-17787 labels:MTP-86361
--comment: oms_alerts_column_addition
alter table inventory_smart.oms_alerts add column raw_roq_earliest int8 null;
alter table inventory_smart.oms_alerts add column roq_unconstrained_earliest int8 null;
alter table inventory_smart.oms_alerts add column receipt_date_earliest date null;
alter table inventory_smart.oms_alerts add column order_placement_date_earliest date null;
alter table inventory_smart.oms_alerts add column date_diff int8 null;

--changeset liquibase:kanishka.parashar:oms_alerts_column_renaming stripComments:false splitStatements:false context:MTP-17787 labels:MTP-86361
--comment: oms_alerts_column_rename
alter table inventory_smart.oms_alerts rename column roq_unconstrained_earliest to order_quantity_earliest;

--changeset liquibase:kanishka.parashar:oms_alerts_column_addition2 stripComments:false splitStatements:false context:MTP-17787 labels:MTP-86361
--comment: oms_alerts_column_addition2
alter table inventory_smart.oms_alerts add column if not exists roq_unconstrained_earliest int8 null;