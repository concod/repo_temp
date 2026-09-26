--liquibase formatted sql
--changeset kishan.patel:oms_orders_recommended_base_1 stripComments:false splitStatements:false context:Release_1_2 labels:DAT-978
--comment: initial changeset for oms_orders_recommended_base
CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_recommended_base (
	id bigserial NOT NULL,
	order_gen_type varchar NOT NULL DEFAULT 'Recommended'::character varying,
	product_code varchar NULL,
	fiscal_year_week int4 NULL,
	loc_code varchar NULL,
	vendor_code varchar NULL,
	start_week_date date NULL,
	expected_receipt_date date NULL,
	unit_cost float4 NULL,
	roq float4 NULL,
	not_before_date date NULL,
	not_after_date date NULL,
	order_status_id int8 NOT NULL DEFAULT 0,
	created_by int4 NOT NULL,
	created_at timestamp NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	approve_by_date date NULL,
	is_deleted bool NULL DEFAULT false,
	is_resolved bool NOT NULL DEFAULT false,
	CONSTRAINT pk_oms_orders_recommended_base PRIMARY KEY (id),
	CONSTRAINT uk_oms_orders_recommended_base UNIQUE (product_code, loc_code, vendor_code, start_week_date, not_before_date, not_after_date)
);

--changeset aman.lakkoju:adding order_type column stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23006
--comment:adding order_type column in oms_orders_recommended_base
ALTER TABLE inventory_smart.oms_orders_recommended_base ADD COLUMN IF NOT EXISTS order_type varchar(20) NULL;

--changeset aman.lakkoju:included constrained roq column stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39628
--comment:included constrained roq column in oms_orders_recommended_base
ALTER TABLE inventory_smart.oms_orders_recommended_base ADD COLUMN IF NOT EXISTS constrained_roq int4 NULL;

--changeset vishal.kumar@impactanalytics.co:included start_week_date_dynamic column and updated data type of order_type column stripComments:false splitStatements:false context:Release_1_1 labels:MTP-41696
--comment:included start_week_date_dynamic column and updated data type of order_type column in oms_orders_recommended_base
ALTER TABLE inventory_smart.oms_orders_recommended_base ADD COLUMN IF NOT EXISTS start_week_date_dynamic date NULL;

ALTER TABLE inventory_smart.oms_orders_recommended_base ALTER COLUMN order_type TYPE varchar USING order_type::varchar;

--changeset aman.lakkoju:added_coo_column stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43547
--comment: added_coo_column
ALTER TABLE inventory_smart.oms_orders_recommended_base ADD COLUMN IF NOT EXISTS country_origin varchar NULL;