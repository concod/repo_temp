--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:wp_master stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for wp_master

CREATE TABLE item_smart.wp_master (
	dept text NOT NULL,
	channel text NOT NULL,
	current_week int8 NOT NULL,
	hierarchy_code int8 NOT NULL,
	product_type int8 NOT NULL,
	created_by int8 DEFAULT 1 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int8 DEFAULT 1 NULL,
	updated_at timestamptz NULL,
	store_count int8 NULL,
	written_sales_dollars float8 NULL,
	compared_week float8 NULL,
	written_sales_units float8 NULL,
	written_sales_cost float8 NULL,
	written_air float8 NULL,
	written_aur float8 NULL,
	written_dr_perc float8 NULL,
	written_backorder_sales_units float8 NULL,
	written_backorder_sales float8 NULL,
	cancelled_dollars float8 NULL,
	cancelled_qty float8 NULL,
	cancelled_cost float8 NULL,
	non_delivered_dollars float8 NULL,
	non_delivered_qty float8 NULL,
	non_delivered_cost float8 NULL,
	wei_age_non_delivered_sales_dollars float8 NULL,
	wei_age_non_delivered_units float8 NULL,
	wei_age_non_delivered_costs float8 NULL,
	delivered_returns_dollars float8 NULL,
	delivered_returns_qty float8 NULL,
	delivered_returns_cost float8 NULL,
	delivered_net_sales_dollars float8 NULL,
	delivered_air float8 NULL,
	delivered_aur float8 NULL,
	delivered_drperc float8 NULL,
	delivered_net_sales_units float8 NULL,
	delivered_net_sales_cost float8 NULL,
	delivered_auc float8 NULL,
	bop_units float8 NULL,
	bop_cost float8 NULL,
	bop_auc float8 NULL,
	atp_units float8 NULL,
	atp_cost float8 NULL,
	aoh_units float8 NULL,
	aoh_cost float8 NULL,
	total_receipt_cost float8 NULL,
	total_receipt_units float8 NULL,
	delivered_gmperc float8 NULL,
	delivered_gm float8 NULL,
	on_order_placed_total float8 NULL,
	on_order_placed_stock float8 NULL,
	on_order_placed_total_unit float8 NULL,
	on_order_placed_stock_unit float8 NULL,
	written_auc float8 NULL,
	written_cancel_retail_rate_perc float8 NULL,
	written_cancel_units_rate_perc float8 NULL,
	written_cancel_cost_rate_perc float8 NULL,
	delivered_retail_return_rate_perc float8 NULL,
	delivered_unit_return_rate_perc float8 NULL,
	delivered_cost_return_rate_perc float8 NULL,
	written_sales_build_ratio float8 NULL,
	written_sales_units_build_ratio float8 NULL,
	delivered_net_sales_build_ratio float8 NULL,
	delivered_net_sales_units_build_ratio float8 NULL,
	on_order_placed_total_auc float8 NULL,
	on_order_placed_stock_auc float8 NULL,
	on_order_placed_spo_auc float8 NULL,
	eop_cost float8 NULL,
	total_receipts_auc float8 NULL,
	stock_receipts_auc float8 NULL,
	spo_receipts_auc float8 NULL,
	eop_auc float8 NULL,
	inv_adj_cost float8 NULL,
	inv_adj_units float8 NULL,
	written_imu float8 NULL,
	delivered_gmroi float8 NULL,
	inv_adj_cost_perc float8 NULL,
	inv_adj_units_perc float8 NULL,
	inv_adj_auc float8 NULL,
	aoh_fwos_units float8 NULL,
	aoh_fwos_cost float8 NULL,
	atp_fwos_units float8 NULL,
	atp_fwos_cost float8 NULL,
	retail_conversion_adjustment float8 NULL,
	on_order_unplaced_total float8 NULL,
	on_order_unplaced_stock float8 NULL,
	on_order_unplaced_total_unit float8 NULL,
	on_order_unplaced_stock_unit float8 NULL,
	on_order_unplaced_total_auc float8 NULL,
	on_order_unplaced_stock_auc float8 NULL,
	l2_name_channel float8 NULL,
	written_gm_perc float8 NULL,
	written_gm_dollar float8 NULL,
	eop_units float8 NULL,
	written_backorder_aur float8 NULL,
	cancelled_aur float8 NULL,
	CONSTRAINT pk_wp_master PRIMARY KEY (dept, current_week, channel, hierarchy_code)
)
PARTITION BY LIST (dept);

ALTER TABLE item_smart.wp_master ADD CONSTRAINT fk_wp_master_created_by FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code);
ALTER TABLE item_smart.wp_master ADD CONSTRAINT fk_wp_master_updated_by FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code);


--changeset pr.suchithra@impactanalytics.co:wp_master_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: added column ia_recommended_receipts
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS ia_recommended_receipts float8 NULL;

--changeset pr.suchithra@impactanalytics.co:wp_master_chg2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: renamed 2 columns and added 2 columns
ALTER TABLE item_smart.wp_master RENAME COLUMN l2_name_channel TO l3_name_channel;
ALTER TABLE item_smart.wp_master RENAME COLUMN ia_recommended_receipts TO recomm_receipt_units;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS recomm_receipt_cost FLOAT8 NULL;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS recomm_receipt_auc FLOAT8 NULL;


--changeset pr.suchithra@impactanalytics.co:wp_master_chg3 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: added some additional columns


ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS markdown_conv_cost_unit FLOAT8 NULL;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS markdown_conv_cost_dollar FLOAT8 NULL;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS aoh_cost_eop FLOAT8 NULL;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS aoh_units_eop FLOAT8 NULL;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS scenario FLOAT8 NULL;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS actualised bool NULL;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS revenue FLOAT8 NULL;
ALTER TABLE item_smart.wp_master ADD COLUMN IF NOT EXISTS discount FLOAT8 NULL;


--changeset jaya.khandelwal@impactanalytics.co:wp_master_chg4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  add few columns for spanx

ALTER TABLE item_smart.wp_master ADD sub_channel text NOT NULL;
ALTER TABLE item_smart.wp_master ADD return_perc float8 NULL;
ALTER TABLE item_smart.wp_master ADD return_units float8 NULL;
ALTER TABLE item_smart.wp_master ADD damage_rate_perc float8 NULL;
ALTER TABLE item_smart.wp_master ADD return_inv float8 NULL;
ALTER TABLE item_smart.wp_master ADD return_dollars float8 NULL;
ALTER TABLE item_smart.wp_master ADD net_sales_dollars float8 NULL;
ALTER TABLE item_smart.wp_master ADD net_sales_units float8 NULL;
ALTER TABLE item_smart.wp_master ADD committed_orders float8 NULL;
ALTER TABLE item_smart.wp_master ADD bop_fwos_units float8 NULL;

--changeset shreyansh.pathak@impactanalytics.co:wp_master_chg5 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  add a new constraint

ALTER TABLE item_smart.wp_master DROP CONSTRAINT pk_wp_master;
ALTER TABLE item_smart.wp_master ADD CONSTRAINT pk_wp_master PRIMARY KEY (dept, current_week, channel, sub_channel, hierarchy_code);

--changeset hemant.kumar@impactanalytics.co:wp_master_indexes stripComments:false splitStatements:false context:Release_index labels:indexes-fix
--comment: added indexes

CREATE INDEX idx_wp_master_channel ON item_smart.wp_master USING btree (channel);
CREATE INDEX idx_wp_master_curr_wk ON item_smart.wp_master USING btree (current_week);
CREATE INDEX idx_wp_master_dept ON item_smart.wp_master USING btree (dept);
CREATE INDEX idx_wp_master_hcode ON item_smart.wp_master USING btree (hierarchy_code);

--changeset abhimanyu.j@impactanalytics.co:wp_master_chg5 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  add few columns for spanx
ALTER TABLE item_smart.wp_master ADD written_aus float8 NULL;



--changeset jaya.khandelwal@impactanalytics.co:wp_master_alert8 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  add few columns for spanx
ALTER TABLE item_smart.wp_master
ADD COLUMN cust_price float8;




--changeset jaya.khandelwal@impactanalytics.co:wp_master_change_9 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  add few columns for spanx
ALTER TABLE item_smart.wp_master 
ADD COLUMN IF NOT EXISTS record_flag_update INT4;