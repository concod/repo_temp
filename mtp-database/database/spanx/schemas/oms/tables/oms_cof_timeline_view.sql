--liquibase formatted sql
--changeset liquibase:oms_cof_timeline_view stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_cof_timeline_view 

CREATE TABLE inventory_smart.oms_cof_timeline_view (
	id serial4 NOT NULL,
	draft_id int4 NOT NULL,
	product_code varchar(255) NOT NULL,
	article varchar(255) NULL,
	loc_code varchar(255) NOT NULL,
	receipt_week int4 NULL,
	dc_inv int4 NULL,
	receipt1 int4 NULL,
	safety_stock_cof int4 NULL,
	predicted_qty int4 NULL,
	total_dc_forecast int4 NULL,
	pending_order int4 NULL,
	approved_quantity int4 NULL,
	ly_sales int4 NULL,
	ly_oh int4 NULL,
	receipt_plan int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT oms_cof_timeline_view_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_oms_cof_timeline_view_article_loc_week ON inventory_smart.oms_cof_timeline_view USING btree (draft_id, article, loc_code, product_code, receipt_week);
