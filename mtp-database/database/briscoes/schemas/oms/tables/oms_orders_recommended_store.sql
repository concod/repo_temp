--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:oor_store_update1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oor_store
--comment: schema for oms_orders_recommended_store Update1

CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_recommended_store (
	fiscal_year_week int4 NULL,
	fiscal_year_month int4 NULL,
	fiscal_year int4 NULL,
	fiscal_year_quarter int4 NULL,
	week_start_date date NULL,
	"month" text NULL,
	id serial4 NOT NULL,
	order_gen_type text NULL,
	store_code text NULL,
	channel text NULL,
	"size" text NULL,
	"style" text NULL,
	article text NULL,
	order_type text NULL,
	flow_id text NULL,
	vendor_code text NULL,
	vendor_name text NULL,
	grade text NULL,
	order_quantity int4 NULL,
	order_cost float4 NULL,
	unit_cost float4 NULL,
	raw_roq int4 NULL,
	roq_unconstrained_eaches int4 NULL,
	roq_constrained int4 NULL,
	immd_roq text NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_shipment int4 NULL,
	min_order_quantity_sku int4 NULL,
	max_order_quantity_sku int4 NULL,
	min_order_quantity_style int4 NULL,
	max_order_quantity_style int4 NULL,
	order_to_po_processing_time int4 NULL,
	lead_time int4 NULL,
	order_placement_date date NULL,
	order_placement_recom_date date NULL,
	order_multiple int4 NULL,
	editable_expected_receipt_date date NULL,
	expected_receipt_date date NULL,
	order_status_id int4 NULL,
	rop date NULL,
	rop_ideal date NULL,
	effective_lead_time int4 NULL,
	inventory_hold int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	approve_by_date date NULL,
	is_deleted bool NULL,
	is_resolved text NULL,
	recom_receipt_date date NULL,
	create_by_date date NULL,
	lost_sales_agg int4 NULL,
	inventory_deficit_agg int4 NULL,
	elt_projected_bop int4 NULL,
	elt_projected_safety_stock int4 NULL,
	lost_sales_agg_1 int4 NULL,
	forecasted_sales float4 NULL,
	target_wos int4 NULL,
	lost_sales_agg_2 int4 NULL,
	excess_inv int4 NULL,
	store_counts int4 NULL,
	store_tier text NULL,
	ia_shipment_order_quantity int4 NULL,
	mode_shipment text NULL,
	order_reason text NULL,
	order_batch_name text NULL,
	order_group_id text NULL,
	vendor_moq_adjusted_roq int4 NULL,
	shipment_optimized_roq int4 NULL,
	size_ratio_store float4 NULL,
	size_ratio_size float4 NULL,
	pack_config float4 NULL,
	pack_id int4 NULL,
	order_quantity_eaches float4 NULL,
	raw_roq_eaches int4 NULL,
	roq_constrained_eaches int4 NULL,
	elt_projected_store_inv int4 NULL,
	editable_effective_lead_time int4 NULL,
	edited_mode_shipment text NULL,
	on_order_quantity int4 NULL,
	elt_sales_forecast_twos int4 NULL,
	landing_cost int4 NULL,
	product_code text NULL,
	store_min int4 NULL,
	store_max int4 NULL,
	store_wos int4 NULL,
	"comment" varchar NULL,
	roq_unconstrained float4 NULL,
	projected_delivery_date date NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	style_name varchar NULL,
	store_name varchar NULL,
	region_name varchar NULL,
	sales_org_name varchar NULL,
	"cost" float8 NULL,
	"ordering" varchar NULL,
	ordering_flag varchar NULL
) PARTITION BY LIST (l0_name);

--changeset raja.duraisamy@impactanalytics.co:oor_store_update_indexing_added stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oor_store
--comment: schema for oms_orders_recommended_store Update indexing added
CREATE INDEX IF NOT EXISTS oms_orders_recommended_store_idx ON inventory_smart.oms_orders_recommended_store USING btree (l0_name, store_code, fiscal_year_week);
CREATE INDEX IF NOT EXISTS oms_orders_recommended_store_l1_l2_l3_idx ON inventory_smart.oms_orders_recommended_store USING btree (l1_name, l2_name, l3_name);

--changeset abhimanyu.sheoran@impcatanalytics.co:datatypesss_alter default stripComments:false splitStatements:false context:Release_1_0 labels:datatype changes
--comment: datatype alter
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN order_gen_type TYPE varchar USING order_gen_type::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN store_code TYPE varchar USING store_code::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN channel TYPE varchar USING channel::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN "size" TYPE varchar USING "size"::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN "style" TYPE varchar USING "style"::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN article TYPE varchar USING article::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN order_type TYPE varchar USING order_type::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN flow_id TYPE varchar USING flow_id::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN vendor_code TYPE varchar USING vendor_code::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN vendor_name TYPE varchar USING vendor_name::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN grade TYPE varchar USING grade::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN is_resolved TYPE varchar USING is_resolved::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN store_tier TYPE varchar USING store_tier::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN mode_shipment TYPE varchar USING mode_shipment::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN order_reason TYPE varchar USING order_reason::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN order_batch_name TYPE varchar USING order_batch_name::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN order_group_id TYPE varchar USING order_group_id::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN product_code TYPE varchar USING product_code::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN edited_mode_shipment TYPE varchar USING edited_mode_shipment::varchar;
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN immd_roq TYPE varchar USING immd_roq::varchar;
--changeset abhimanyu.sheoran@impcatanalytics.co:datatypesss_alter_mo default stripComments:false splitStatements:false context:Release_1_0 labels:datatype changes mo
--comment: datatype alter mo
ALTER TABLE inventory_smart.oms_orders_recommended_store ALTER COLUMN "month" TYPE varchar USING "month"::varchar;

--changeset abhimanyu.sheoran@impcatanalytics.co:opdog_col_add stripComments:false splitStatements:false context:Release_1_0 labels:og_date_addn
--comment: og date add
ALTER TABLE inventory_smart.oms_orders_recommended_store ADD order_placement_date_original date NULL;


--changeset chandranil.ghosh@impactanalytics.co:oor_store_update_indexing_added_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oor_store
--comment: schema for oms_orders_recommended_store Update indexing added
CREATE INDEX IF NOT EXISTS idx_oms_orders_recommended_store_article
  ON inventory_smart.oms_orders_recommended_store (article);
CREATE INDEX  IF NOT EXISTS idx_oms_orders_recommended_store_article_store_code
  ON inventory_smart.oms_orders_recommended_store (article, store_code);


  --changeset raja.duraisamy@impactanalytics.co:oor_store_update_indexing_added_2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oor_store
  --comment: schema for oms_orders_recommended_store Update indexing added
DROP INDEX IF EXISTS inventory_smart.idx_oms_orders_recommended_store_article;
DROP INDEX IF EXISTS inventory_smart.oms_orders_recommended_store_idx;
DROP INDEX IF EXISTS inventory_smart.oms_orders_recommended_store_l1_l2_l3_idx;
CREATE INDEX IF NOT EXISTS oms_orders_recommended_l0_l1_l2_store_idx ON inventory_smart.oms_orders_recommended_store USING btree (l0_name, l1_name, l2_name, store_code);
CREATE INDEX  IF NOT EXISTS idx_oms_orders_recommended_product_store_idx ON inventory_smart.oms_orders_recommended_store (product_code, store_code);

--changeset chaitanya.krishna@impactanalytics.co:idx_oor_store_order_placement_date_only stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oor_store
--comment: btree on order_placement_date (ONLY parent) for date-range predicates on partitioned oms_orders_recommended_store
CREATE INDEX IF NOT EXISTS idx_orders_date ON inventory_smart.oms_orders_recommended_store USING btree (order_placement_date);