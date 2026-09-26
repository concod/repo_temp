--liquibase formatted sql
--changeset pruthviraj.savanur@impactanalytics.co:oms_central_table_cb stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_central_table_cb
--comment: initial changeset for oms_central_table_cb

CREATE TABLE IF NOT EXISTS inventory_smart.oms_central_table (
    product_code varchar(100) not null,
    loc_code varchar(100) not null,
    channel varchar(100) not null,
    vendor_code varchar(100) not null,
    default_flag boolean,
    mode_of_shipment varchar(100) not null,
	vendor_lead_time int4 null,
    shipping_lead_time int4 null,
    qc_time int4 null,
    vendor_shutdown_days int4 null,
    eff_lead_time int4 null,
    order_placement_date_original DATE,
    fiscal_year_week_original int4,
    order_week_start_date_original DATE,
    order_week_end_date_original DATE,
    order_placement_date DATE not null,
    fiscal_year_week int4,
    order_week_start_date DATE,
    order_week_end_date DATE,
    vlt_date DATE,
    receipt_date DATE,
    receipt_week int4,
    receipt_week_start_date DATE,
    receipt_week_end_date DATE,
    replenishment_strategy varchar(100) null,
    order_strategy varchar(100) null,
    demand_weeks int4,
    order_frequency varchar(100) null,
    shipment_frequency varchar(100) null,
    demand_end_week int4,
    order_type varchar(100) null,
    skip_flag int4 null,
	
	CONSTRAINT pk_oms_central_table PRIMARY KEY (product_code, loc_code, channel, vendor_code, mode_of_shipment, order_placement_date)
);