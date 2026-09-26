--liquibase formatted sql
--changeset liquibase:raja.duraisamy:oms_orders_recommended stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: initial changeset for oms_orders_recommended
CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_recommended (
	order_gen_type varchar(255) NULL,
	product_code varchar(255) NULL,
	article varchar(255) NULL,
	"size" varchar(255) NULL,
	"style" varchar(255) NULL,
	loc_code varchar(255) NULL,
	vendor_code varchar(255) NULL,
	vendor_name varchar(255) NULL,
	order_type varchar(255) NULL,
	grade varchar(255) NULL,
	unit_cost float8 NULL,
	lead_time int4 NULL,
	order_to_po_processing_time int4 NULL,
	effective_lead_time int4 NULL,
	order_multiple int4 NULL,
	inventory_hold int4 NULL,
	order_status_id int4 NULL,
	created_by int4 NULL,
	created_at date NULL,
	updated_by int4 NULL,
	updated_at date NULL,
	approve_by_date date NULL,
	create_by_date date NULL,
	immd_roq int4 NULL,
	lost_sales_agg float4 NULL,
	inventory_deficit_agg float4 NULL,
	orders_upto_qty int4 NULL,
	elt_projected_bop int4 NULL,
	elt_projected_safety_stock int4 NULL,
	target_qty int4 NULL,
	lost_sales_agg_1 float4 NULL,
	forecasted_sales int4 NULL,
	target_wos int4 NULL,
	lost_sales_agg_2 float4 NULL,
	excess_inv float4 NULL,
	unmapped_store_inventory float4 NULL,
	store_counts int4 NULL,
	store_groups int4 NULL,
	mode_shipment varchar(255) NULL,
	order_reason varchar(255) NULL,
	rop date NULL,
	order_quantity int4 NULL,
	order_placement_date date NULL,
	order_placement_recom_date date NULL,
	rop_ideal date NULL,
	fiscal_year_week int4 NULL,
	week_start_date date NULL,
	"month" varchar(50) NULL,
	fiscal_year_month varchar NULL,
	fiscal_year varchar NULL,
	fiscal_year_quarter varchar NULL,
	order_cost float8 NULL,
	roq_constrained int4 NULL,
	roq_unconstrained int4 NULL,
	expected_receipt_date date NULL,
	editable_expected_receipt_date date NULL,
	recom_receipt_date date NULL,
	not_before_date date NULL,
	not_after_date date NULL,
	editable_not_before_date date NULL,
	editable_not_after_date date NULL,
	raw_roq float4 NULL,
	ia_shipment_order_quantity int4 NULL,
	flow_id varchar(255) NULL,
	id serial4 NOT NULL,
	is_deleted bool NULL,
	is_resolved bool NULL,
	channel varchar(50) NULL,
	min_order_quantity_sku int4 NULL,
	max_order_quantity_sku int4 NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_shipment int4 NULL,
	min_order_quantity_style int4 NULL,
	max_order_quantity_style int4 NULL,
	order_batch_name varchar(255) NULL,
	order_group_id varchar(255) NULL,
	CONSTRAINT uk_oms_orders_recommended UNIQUE (product_code, loc_code, channel, vendor_code, rop, expected_receipt_date, order_status_id, order_gen_type)
);

--changeset kanishka.parashar:changing_data_type stripComments:false splitStatements:false context:Release_1_0 labels:VS-377
--comment: updating_fiscal_year_month
ALTER TABLE inventory_smart.oms_orders_recommended 
ALTER COLUMN fiscal_year TYPE INT4 
USING fiscal_year::INTEGER;

ALTER TABLE inventory_smart.oms_orders_recommended 
ALTER COLUMN fiscal_year_month TYPE INT4 
USING fiscal_year_month::INTEGER;

ALTER TABLE inventory_smart.oms_orders_recommended 
ALTER COLUMN fiscal_year_quarter TYPE INT4 
USING fiscal_year_quarter::INTEGER;

--changeset kanishka.parashar:changing_data_type2 stripComments:false splitStatements:false context:Release_1_0 labels:data_type_updates
--comment: updating_columns
ALTER TABLE inventory_smart.oms_orders_recommended  
ALTER COLUMN order_quantity TYPE FLOAT USING order_quantity::FLOAT;  

ALTER TABLE inventory_smart.oms_orders_recommended 
ALTER COLUMN roq_unconstrained TYPE FLOAT USING roq_unconstrained::FLOAT;  

ALTER TABLE inventory_smart.oms_orders_recommended  
ALTER COLUMN roq_constrained TYPE FLOAT USING roq_constrained::FLOAT;  

--changeset kanishka.parashar:changing_data_type3 stripComments:false splitStatements:false context:Release_1_0 labels:data_type_update
--comment: reverting_changes
ALTER TABLE inventory_smart.oms_orders_recommended  
ALTER COLUMN roq_constrained TYPE int4 USING roq_constrained::int4; 

ALTER TABLE inventory_smart.oms_orders_recommended  
ALTER COLUMN roq_unconstrained TYPE int4 USING roq_unconstrained::int4; 

--changeset kanishka.parashar:changing_data_type_4 stripComments:false splitStatements:false context:Release_1_0 labels:data_type_updates_1
--comment: updating_columns_1
ALTER TABLE inventory_smart.oms_orders_recommended  
ALTER COLUMN order_quantity TYPE INT USING order_quantity::INT;  

--changeset shreyansh.jain:adding_new_column_store_inv_if_not_exists stripComments:false splitStatements:false context:Release_1_0 labels:data_type_updates_1
--comment: adding_new_column_store_inv_if_not_exists
alter table inventory_smart.oms_orders_recommended
add column IF NOT EXISTS elt_projected_store_inv int4;


--changeset shreyansh.jain:adding_new_column_order_placement_date_original_if_not_exists stripComments:false splitStatements:false context:Release_1_0 labels:data_type_updates_1
--comment: adding_new_column_order_placement_date_original_if_not_exists
ALTER TABLE inventory_smart.oms_orders_recommended ADD COLUMN IF NOT EXISTS  order_placement_date_original DATE;


