--liquibase formatted sql
--changeset  vishal.kumar@impactanalytics.co:liquibase:oms_orders_recommended_2 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment:initial changeset for oms_orders_recommended
CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_recommended (
	id bigserial NOT NULL,
	order_gen_type varchar NOT NULL DEFAULT 'Recommended'::character varying,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	rop date NOT NULL,
	grade varchar NOT NULL,
	order_quantity int4 NOT NULL,
	unit_cost float8 NOT NULL,
	roq_constrained int4 NULL,
	roq_unconstrained int4 NULL,
	order_placement_date date NULL,
	order_placement_recom_date date NULL,
	expected_receipt_date date NULL,
	rop_ideal date NULL,
	lead_time int4 NULL,
	effective_lead_time int4 NULL,
	min_order_quantity int4 NULL,
	max_order_quantity int4 NULL,
	pack_size int4 NULL,
	inventory_hold int4 NULL,
	order_status_id int8 NOT NULL DEFAULT 0,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	approve_by_date date NULL,
	is_deleted bool NULL DEFAULT false,
	is_resolved bool NOT NULL DEFAULT false,
	recom_receipt_date date NULL,
	not_before_date date NULL,
	not_after_date date NULL,
	create_by_date date NULL,
	CONSTRAINT pk_oms_orders_recommended PRIMARY KEY (id),
	CONSTRAINT uk_oms_orders_recommended UNIQUE (product_code, loc_code, vendor_code, rop, not_before_date, not_after_date)
);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_ord_status ON inventory_smart.oms_orders_recommended USING btree (order_status_id);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_product_code ON inventory_smart.oms_orders_recommended USING btree (product_code);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_product_loc_code ON inventory_smart.oms_orders_recommended USING btree (product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_ord_recom_rop ON inventory_smart.oms_orders_recommended USING btree (rop);

--changeset kishan.pate:editable column add stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1017
--comment: columns editable add for oms orders recommended

ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS editable_not_before_date date NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS editable_not_after_date date NULL;

--changeset kishan.pate:change in uk add stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1065
--comment: uk change for oms orders recommended
ALTER TABLE inventory_smart.oms_orders_recommended DROP CONSTRAINT uk_oms_orders_recommended;
ALTER TABLE inventory_smart.oms_orders_recommended ADD CONSTRAINT uk_oms_orders_recommended UNIQUE (product_code, loc_code, vendor_code, rop, not_before_date, not_after_date, order_status_id);


--changeset shreyansh.jain:lost_sales_agg,inventory_deficit_agg columns added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-18295
--comment: lost_sales_agg,inventory_deficit_agg columns added for oms orders recommended
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS lost_sales_agg float4 NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS inventory_deficit_agg float4 NULL;

--changeset sairaghunath.k:orders_upto_qty,elt_projected_safety_stock,elt_projected_bop,order_type columns added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-19233,MTP-21612
--comment: orders_upto_qty,elt_projected_safety_stock,elt_projected_bop columns added for oms orders recommended
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS orders_upto_qty int4 NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS elt_projected_bop int4 NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS elt_projected_safety_stock int4 NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS order_type varchar NULL;

--changeset aman.lakkoju:target_qty column added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22839
--comment: target_qty column added for oms orders recommended

ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS target_qty int4 NULL;


--changeset shreyansh.jain:lost_sales_agg_1 column added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23245
--comment: lost_sales_agg_1 column added for oms orders recommended
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS lost_sales_agg_1 float4 NULL;

--changeset shreyansh.jain:raw_roq column added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-35034
--comment: raw_roq column added for oms orders recommended

ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS raw_roq float4 NULL;

--changeset shreyansh.jain:forecasted sales column added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-37454
--comment: forecasted sales column added

ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS forecasted_sales int4 NULL;

--changeset aman.lakkoju:target_wos column added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42624
--comment: target_wos column added

ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS target_wos int4 NULL;

--changeset shreyansh.jain:lost_sales_agg_2 column added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43547
--comment: lost_sales_agg_2 column added for oms orders recommended
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS lost_sales_agg_2 float4 NULL;

--changeset Aman.lakkoju:Included excess inv and unmapped store inv columns stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43713
--comment: Included excess inv and unmapped store inv columns 

ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS excess_inv float4 NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS unmapped_store_inventory float4 NULL;


--changeset shreyansh.jain:Added store_groups and store_counts columns stripComments:false splitStatements:false context:Release_1_0 labels:MTP-45153
--comment:Added store_groups and store_counts columns 
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS store_groups varchar NULL;
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS store_counts int4 NULL;

--changeset aman.lakkoju:added_coo_column stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43547
--comment: added_coo_column

ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS country_origin varchar NULL;