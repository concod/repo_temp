--liquibase formatted sql
--changeset liquibase:oms_cof_orders_recommended_2 stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_cof_orders_recommended 

CREATE TABLE IF NOT EXISTS inventory_smart.oms_cof_orders_recommended (
	id serial4 NOT NULL,
	draft_id int4 NULL,
	article varchar NULL,
	loc_code varchar NULL,
	adjusted_delivery_date timestamptz NULL,
	channel varchar NULL,
	"size" varchar NULL,
	"style" varchar NULL,
	receipt_fiscal_year_week int4 NULL,
	min_order_quantity_style int4 NULL,
	min_order_quantity_style_color int4 NULL,
	min_order_quantity_sku int4 NULL,
	order_type varchar NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	raw_roq_cof int4 NULL,
	roq_unconstrained_cof int4 NULL,
	order_quantity_cof int4 NULL,
	predicted_qty int4 NULL,
	total_dc_forecast int4 NULL,
	buffer_stock_method varchar NULL,
	buffer_stock_input varchar NULL,
	lead_time int4 NULL,
	order_generation_date timestamptz NULL,
	demand_start_date timestamptz NULL,
	demand_end_date timestamptz NULL,
	demand_twos int4 NULL,
	receipt1 int4 NULL,
	approved_quantity int4 NULL,
	pending_order int4 NULL,
	dc_inv int4 NULL,
	safety_stock_cof int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	elt_projected_safety_stock_cof int4 NULL,
	product_code varchar NULL,
	unconstrained_roq_cof_l1 int4 NULL,
	unconstrained_roq_cof_l2 int4 NULL,
	unconstrained_roq_cof_l3 int4 NULL,
	l4_name varchar NULL,
	ia_shipment_order_qty_cof int4 NULL,
	projected_delivery_date timestamp NULL,
	roq_constrained_cof float4 NULL,
	CONSTRAINT oms_cof_orders_recommended_pkey PRIMARY KEY (id),
	CONSTRAINT uq_reco_unique_row UNIQUE (draft_id, loc_code, product_code, receipt_fiscal_year_week)
);
CREATE INDEX IF NOT EXISTS idx_ocr_article_week_draft ON inventory_smart.oms_cof_orders_recommended USING btree (article, receipt_fiscal_year_week, draft_id);
CREATE INDEX IF NOT EXISTS idx_ocr_covering ON inventory_smart.oms_cof_orders_recommended USING btree (article, receipt_fiscal_year_week) INCLUDE (raw_roq_cof, order_quantity_cof, roq_unconstrained_cof, roq_constrained_cof, receipt1, pending_order, approved_quantity, elt_projected_safety_stock_cof);
CREATE INDEX IF NOT EXISTS idx_ocr_product_week_draft ON inventory_smart.oms_cof_orders_recommended USING btree (product_code, receipt_fiscal_year_week, draft_id);
CREATE INDEX IF NOT EXISTS idx_oms_cof_orders_recommended_draft_id_article_loc_code_v1 ON inventory_smart.oms_cof_orders_recommended USING btree (draft_id, article, loc_code);

--liquibase formatted sql
--changeset liquibase:oms_cof_orders_recommended_alter_1 stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: added is_approved column to oms_cof_orders_recommended table

ALTER TABLE inventory_smart.oms_cof_orders_recommended
ADD COLUMN IF NOT EXISTS is_approved bool NULL DEFAULT FALSE;