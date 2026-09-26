--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:iaf_master stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for iaf_master


CREATE TABLE item_smart.iaf_master (
	dept text NOT NULL,
	channel text NOT NULL,
	current_week int8 NOT NULL,
	hierarchy_code int8 NOT NULL,
	product_type int8 NOT NULL,
	created_by int8 DEFAULT 1 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int8 DEFAULT 1 NULL,
	updated_at timestamptz NULL,
	written_sales_dollars float8 NULL,
	written_sales_units float8 NULL,
	written_sales_cost float8 NULL,
	written_air float8 NULL,
	written_aur float8 NULL,
	written_auc float8 NULL,
	written_gm_perc float8 NULL,
	written_gm_dollar float8 NULL,
	percent_off int8 NULL,
	scenario float8 NULL,
	actualised bool NULL,
	revenue float8 NULL,
	discount float8 NULL,
	CONSTRAINT pk_iaf_master PRIMARY KEY (dept, current_week, channel, hierarchy_code)
)
PARTITION BY LIST (dept);


ALTER TABLE item_smart.iaf_master ADD CONSTRAINT fk_iaf_master_created_by FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code);
ALTER TABLE item_smart.iaf_master ADD CONSTRAINT fk_iaf_master_updated_by FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code);


--changeset pr.suchithra@impactanalytics.co:iaf_master_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: renamed column percent_off to written_dr_perc

ALTER TABLE  item_smart.iaf_master RENAME COLUMN percent_off TO written_dr_perc;


--changeset pr.suchithra@impactanalytics.co:iaf_master_chg2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: added some additional columns

ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS store_count INT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_backorder_sales_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_backorder_sales FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS cancelled_dollars FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS cancelled_qty FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS cancelled_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS non_delivered_dollars FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS non_delivered_qty FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS non_delivered_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS wei_age_non_delivered_sales_dollars FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS wei_age_non_delivered_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS wei_age_non_delivered_costs FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_returns_dollars FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_returns_qty FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_returns_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_net_sales_dollars FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_air FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_aur FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_drperc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_net_sales_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_net_sales_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS bop_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS bop_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS bop_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS atp_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS atp_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS aoh_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS aoh_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS total_receipt_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS total_receipt_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_gmperc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_gm FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_placed_total FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_placed_stock FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_placed_total_unit FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_placed_stock_unit FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_cancel_retail_rate_perc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_cancel_units_rate_perc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_cancel_cost_rate_perc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_retail_return_rate_perc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_unit_return_rate_perc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_cost_return_rate_perc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_sales_build_ratio FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_sales_units_build_ratio FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_net_sales_build_ratio FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_net_sales_units_build_ratio FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_placed_total_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_placed_stock_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_placed_spo_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS eop_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS total_receipts_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS stock_receipts_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS spo_receipts_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS eop_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS inv_adj_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS inv_adj_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_imu FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS delivered_gmroi FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS inv_adj_cost_perc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS inv_adj_units_perc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS inv_adj_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS aoh_fwos_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS aoh_fwos_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS atp_fwos_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS atp_fwos_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS retail_conversion_adjustment FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_unplaced_total FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_unplaced_stock FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_unplaced_total_unit FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_unplaced_stock_unit FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_unplaced_total_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS on_order_unplaced_stock_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS l3_name_channel FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS eop_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS written_backorder_aur FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS cancelled_aur FLOAT8 NULL;

--changeset pr.suchithra@impactanalytics.co:iaf_master_chg3 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: added some additional columns

ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS recomm_receipt_units FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS recomm_receipt_cost FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS recomm_receipt_auc FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS markdown_conv_cost_unit FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS markdown_conv_cost_dollar FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS aoh_cost_eop FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS aoh_units_eop FLOAT8 NULL;
ALTER TABLE item_smart.iaf_master ADD COLUMN IF NOT EXISTS compared_week INT8 NULL;


--changeset pr.suchithra@impactanalytics.co:iaf_master_chg4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: changing data type of written_dr_perc to float

ALTER TABLE item_smart.iaf_master ALTER COLUMN written_dr_perc TYPE FLOAT8;

--changeset pundarikaksha.mishra@impactanalytics.co:wp_master_indexes stripComments:false splitStatements:false context:Release_index labels:indexes-fix
--comment: added indexes

CREATE INDEX idx_iaf_master_channel ON item_smart.iaf_master USING btree (channel);
CREATE INDEX idx_iaf_master_curr_wk ON item_smart.iaf_master USING btree (current_week);
CREATE INDEX idx_iaf_master_dept ON item_smart.iaf_master USING btree (dept);
CREATE INDEX idx_iaf_master_hcode ON item_smart.iaf_master USING btree (hierarchy_code);

--changeset pardhu.gopalam@impactanalytics.co:arhaus_isactive_changes stripComments:false splitStatements:false context:Release_1_0 labels:isactive_changes
--comment: added isactive_column
ALTER TABLE item_smart.iaf_master ADD is_active bool NULL DEFAULT TRUE;