--liquibase formatted sql
--changeset liquibase:oms_kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: initial changeset for oms_kpi
CREATE TABLE IF NOT EXISTS inventory_smart.oms_kpi (
product_code varchar NOT NULL,
	loc_code varchar NULL,
	dc_inv int4 NULL,
	safety_stock int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	effective_lead_time int4 NULL,
	adjusted_forecast_qty_4w float8 NULL,
	adjusted_forecast_qty_4w_lc float8 NULL,
	adjusted_forecast_qty_8w float8 NULL,
	adjusted_forecast_qty_8w_lc float8 NULL,
	adjusted_forecast_qty_12w float8 NULL,
	adjusted_forecast_qty_12w_lc float8 NULL,
	wos int4 NULL,
	target_service_level float8 NULL,
	ss_base float4 NULL,
	system_inv int4 NULL,
	store_inv int4 NULL,
	open_receipt_units int4 NULL,
	mrpc float8 NULL,
	channel varchar not NULL,
	CONSTRAINT pk_oms_kpi PRIMARY KEY (product_code, loc_code, channel)
);

--changeset kanishka.parashar:adding_column stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: adding_column
ALTER TABLE inventory_smart.oms_kpi ADD COLUMN min_order_quantity_sku int4 NULL;

--changeset kanishka.parashar:adding_column_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: adding_column_v1
alter table inventory_smart.oms_kpi 
add column order_multiple int4 null;


--changeset poojith.krishna:oms_kpi_datatype stripComments:false splitStatements:false context:initial_release labels:add_columns
--comment: columns add in oms_kpi


CREATE SEQUENCE inventory_smart.oms_kpi_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START 1
    CACHE 1
    NO CYCLE;


ALTER TABLE inventory_smart.oms_kpi
ADD COLUMN id INT NOT null DEFAULT nextval('inventory_smart.oms_kpi_id_seq'::regclass),
ADD COLUMN min_order_quantity_style int4,
ADD COLUMN max_order_quantity_style INT4,
ADD COLUMN max_order_quantity_sku INT4,
ADD COLUMN min_order_quantity_shipment INT4,
ADD COLUMN max_order_quantity_shipment INT4,
ADD COLUMN column_updated varchar,
ADD COLUMN vendor_code VARCHAR,
ADD COLUMN vendor_name VARCHAR,
ADD COLUMN if not exists year_week VARCHAR,
ADD COLUMN if not exists mrpc int4;

