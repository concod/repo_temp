--liquibase formatted sql
--changeset liquibase:oms_alerts_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_alerts_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_alerts (
	article varchar(50) NULL,
	"style" varchar(50) NULL,
	loc_code varchar(50) NULL,
	channel varchar(50) NULL,
	vendor_code varchar NULL,
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

--changeset pradeep.kumar:setting_not_nulls stripComments:false splitStatements:false context:Release_1_0 labels:set_not_null_constraints
--comment: setting not null to required columns

ALTER TABLE inventory_smart.oms_alerts ALTER COLUMN loc_code SET NOT NULL;
ALTER TABLE inventory_smart.oms_alerts ALTER COLUMN style SET NOT NULL;
ALTER TABLE inventory_smart.oms_alerts ALTER COLUMN article SET NOT NULL;
ALTER TABLE inventory_smart.oms_alerts ALTER COLUMN vendor_code SET NOT NULL;
ALTER TABLE inventory_smart.oms_alerts ALTER COLUMN channel SET NOT NULL;

ALTER TABLE inventory_smart.oms_alerts
ADD CONSTRAINT pk_oms_alerts PRIMARY KEY (article, style, loc_code, channel, vendor_code);

--changeset sairaghunath.k:altering schema of the table stripComments:false splitStatements:false context:Release_1_0 labels:set_not_null_constraints
--comment: altering schema of the tables
ALTER TABLE inventory_smart.oms_alerts 
	drop column if exists next_order_cycle_date,
	ADD COLUMN if not exists next_order_cycle_receipt_date DATE NULL,
    ADD COLUMN if not exists "size" TEXT NULL,
    ADD COLUMN if not exists product_code TEXT NULL,
    ADD COLUMN if not exists historic_sales_unit INT8 NULL,
    ADD COLUMN if not exists historic_sales_value FLOAT8 NULL,
    ADD COLUMN if not exists lost_sales_aggregated_unit INT8 NULL,
    ADD COLUMN if not exists lost_sales_aggregated_value FLOAT8 NULL,
    ADD COLUMN if not exists potential_sales_unit INT8 NULL,
    ADD COLUMN if not exists potential_sales_value FLOAT8 NULL,
    ADD COLUMN if not exists dc_wos_oh_oo_it INT8 NULL,
    ADD COLUMN if not exists dc_store_wos_oh_oo_it INT8 NULL;

--changeset harsh.agrawal:updated schema of oms_alerts stripComments:false splitStatements:false context:Release_1_0 labels:set_not_null_constraints
--comment: updating constraints and schema of the table

ALTER TABLE inventory_smart.oms_alerts ALTER COLUMN "size" SET NOT NULL;
ALTER TABLE inventory_smart.oms_alerts DROP CONSTRAINT IF EXISTS pk_oms_alerts;
ALTER TABLE inventory_smart.oms_alerts ADD CONSTRAINT pk_oms_alerts PRIMARY KEY (article, style, loc_code, channel, vendor_code, "size");

--changeset pradeep.kumar:oms_alerts_column_addition stripComments:false splitStatements:false context:Release_1_0 labels:adding_columns
--comment: oms_alerts_column_addition
alter table inventory_smart.oms_alerts add column raw_roq_earliest int8 null;
alter table inventory_smart.oms_alerts add column order_quantity_earliest int8 null;
alter table inventory_smart.oms_alerts add column receipt_date_earliest date null;
alter table inventory_smart.oms_alerts add column order_placement_date_earliest date null;
alter table inventory_smart.oms_alerts add column date_diff int8 null;

--changeset pradeep_kumar:oms_alerts_column_addition2 stripComments:false splitStatements:false context:Release_1_0 labels:adding_columns
--comment: oms_alerts_column_addition2
alter table inventory_smart.oms_alerts add column if not exists roq_unconstrained_earliest int8 null;

--changeset pradeep_kumar:oms_alerts_column_addition3 stripComments:false splitStatements:false context:Release_1_0 labels:adding_columns
--comment: oms_alerts_column_addition3
alter table inventory_smart.oms_alerts add column if not exists is_recom_orders_resolved bool null;