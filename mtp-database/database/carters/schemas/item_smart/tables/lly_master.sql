--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:lly_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for lly_master

CREATE TABLE IF NOT EXISTS item_smart.lly_master (
	country text NOT NULL,
	channel text NOT NULL,
	hierarchy_code numeric NOT NULL,
	current_week int4 NOT NULL,
	compared_week int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	scenario float4 NULL,
	actualised bool NULL,
	revenue float4 NULL,
	discount float4 NULL,
	store_count int4 NULL,
	written_sales_dollars float4 NULL,
	written_sales_units float4 NULL,
	written_sales_cost float4 NULL,
	written_air float4 NULL,
	written_aur float4 NULL,
	written_auc float4 NULL,
	written_dr_perc float4 NULL,
	written_gm_perc float4 NULL,
	written_gm_dollar float4 NULL,
	written_imu float4 NULL,
	eop_units float4 NULL,
	eop_cost float4 NULL,
	eop_auc float4 NULL,
	bop_units float4 NULL,
	bop_cost float4 NULL,
	bop_auc float4 NULL,
	fwos float4 NULL,
	on_order_placed_total_unit float4 NULL,
	on_order_unplaced_total_unit float4 NULL,
	on_order_placed_total float4 NULL,
	on_order_unplaced_total float4 NULL,
	on_order_placed_total_auc float4 NULL,
	on_order_unplaced_total_auc float4 NULL,
	total_receipt_cost float4 NULL,
	total_receipt_units float4 NULL,
	total_receipt_auc float4 NULL,
	total_receipt_msrp float4 NULL,
	on_order_placed_msrp float4 NULL,
	total_receipt_msrp_per_unit float4 NULL,
	on_oorder_placed_msrp_per_unit float4 NULL,
	recomm_receipt_units int4 NULL,
	recomm_receipt_cost int4 NULL,
	recomm_receipt_auc int4 NULL,
	recomm_receipt_msrp int4 NULL,
	recomm_receipt_msrp_per_unit int4 NULL,
	bop_units_bnm_store float4 NULL,
	bop_cost_bnm_store float4 NULL,
	bop_auc_bnm_store float4 NULL,
	bop_units_ecom float4 NULL,
	bop_cost_ecom float4 NULL,
	bop_auc_ecom float4 NULL,
	bop_units_bnm_dc float4 NULL,
	bop_cost_bnm_dc float4 NULL,
	bop_auc_bnm_dc float4 NULL,
	omnia_forecast_units int4 NULL,
	eop_units_bnm_store float4 NULL,
	eop_cost_bnm_store float4 NULL,
	eop_auc_bnm_store float4 NULL,
	eop_units_ecom float4 NULL,
	eop_cost_ecom float4 NULL,
	eop_auc_ecom float4 NULL,
	eop_units_bnm_dc float4 NULL,
	eop_cost_bnm_dc float4 NULL,
	eop_auc_bnm_dc float4 NULL,
	CONSTRAINT lly_master_pk PRIMARY KEY (country, channel, current_week, hierarchy_code)
)
PARTITION BY LIST (country);


--changeset shrey.jaiswal@impactanalytics.co:lly_master_chg5 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  drop columns and add new columns

ALTER TABLE item_smart.lly_master RENAME COLUMN on_oorder_placed_msrp_per_unit TO on_order_placed_msrp_per_unit;

--changeset sonika.baheti@impactanalytics.co:lly_master_2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  rename columns

ALTER TABLE item_smart.lly_master ADD product_type int8 DEFAULT 0 NULL;
ALTER TABLE item_smart.lly_master RENAME COLUMN country TO dept;

--changeset shreyansh.pathak@impactanalytics.co:lly_master_chg6 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for hierarchy code column

ALTER TABLE item_smart.lly_master ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;

--changeset shreyansh.pathak@impactanalytics.co:lly_master_chg7 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.lly_master ALTER COLUMN created_by TYPE int8 USING created_by::int8;
ALTER TABLE item_smart.lly_master ALTER COLUMN updated_by TYPE int8 USING updated_by::int8;
ALTER TABLE item_smart.lly_master ALTER COLUMN scenario TYPE float8 USING scenario::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN revenue TYPE float8 USING revenue::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN discount TYPE float8 USING discount::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN store_count TYPE int8 USING store_count::int8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_sales_dollars TYPE float8 USING written_sales_dollars::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_sales_units TYPE float8 USING written_sales_units::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_sales_cost TYPE float8 USING written_sales_cost::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_air TYPE float8 USING written_air::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_aur TYPE float8 USING written_aur::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_auc TYPE float8 USING written_auc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_auc_bnm_dc TYPE float8 USING eop_auc_bnm_dc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_cost_bnm_dc TYPE float8 USING eop_cost_bnm_dc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_units_bnm_dc TYPE float8 USING eop_units_bnm_dc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_auc_ecom TYPE float8 USING eop_auc_ecom::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_cost_ecom TYPE float8 USING eop_cost_ecom::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_units_ecom TYPE float8 USING eop_units_ecom::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_auc_bnm_store TYPE float8 USING eop_auc_bnm_store::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_cost_bnm_store TYPE float8 USING eop_cost_bnm_store::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_units_bnm_store TYPE float8 USING eop_units_bnm_store::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN omnia_forecast_units TYPE float8 USING omnia_forecast_units::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_auc_bnm_dc TYPE float8 USING bop_auc_bnm_dc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_cost_bnm_dc TYPE float8 USING bop_cost_bnm_dc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_units_bnm_dc TYPE float8 USING bop_units_bnm_dc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_auc_ecom TYPE float8 USING bop_auc_ecom::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_cost_ecom TYPE float8 USING bop_cost_ecom::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_units_ecom TYPE float8 USING bop_units_ecom::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_auc_bnm_store TYPE float8 USING bop_auc_bnm_store::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_cost_bnm_store TYPE float8 USING bop_cost_bnm_store::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_units_bnm_store TYPE float8 USING bop_units_bnm_store::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN recomm_receipt_msrp_per_unit TYPE float8 USING recomm_receipt_msrp_per_unit::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN recomm_receipt_msrp TYPE float8 USING recomm_receipt_msrp::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN recomm_receipt_auc TYPE float8 USING recomm_receipt_auc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN recomm_receipt_cost TYPE float8 USING recomm_receipt_cost::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN recomm_receipt_units TYPE float8 USING recomm_receipt_units::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN on_order_placed_msrp_per_unit TYPE float8 USING on_order_placed_msrp_per_unit::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN total_receipt_msrp_per_unit TYPE float8 USING total_receipt_msrp_per_unit::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN on_order_placed_msrp TYPE float8 USING on_order_placed_msrp::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN total_receipt_msrp TYPE float8 USING total_receipt_msrp::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN total_receipt_auc TYPE float8 USING total_receipt_auc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN total_receipt_units TYPE float8 USING total_receipt_units::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN total_receipt_cost TYPE float8 USING total_receipt_cost::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN on_order_unplaced_total_auc TYPE float8 USING on_order_unplaced_total_auc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN on_order_placed_total_auc TYPE float8 USING on_order_placed_total_auc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN on_order_unplaced_total TYPE float8 USING on_order_unplaced_total::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN on_order_placed_total TYPE float8 USING on_order_placed_total::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN on_order_unplaced_total_unit TYPE float8 USING on_order_unplaced_total_unit::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN on_order_placed_total_unit TYPE float8 USING on_order_placed_total_unit::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN fwos TYPE float8 USING fwos::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_auc TYPE float8 USING bop_auc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_cost TYPE float8 USING bop_cost::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN bop_units TYPE float8 USING bop_units::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_auc TYPE float8 USING eop_auc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_cost TYPE float8 USING eop_cost::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN eop_units TYPE float8 USING eop_units::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_imu TYPE float8 USING written_imu::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_gm_dollar TYPE float8 USING written_gm_dollar::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_gm_perc TYPE float8 USING written_gm_perc::float8;
ALTER TABLE item_smart.lly_master ALTER COLUMN written_dr_perc TYPE float8 USING written_dr_perc::float8;



--changeset kalyan.chandu@impactanalytics.co:lly_master_indexes stripComments:false splitStatements:false context:Release_index labels:indexes-fix
--comment: added indexes
CREATE INDEX idx_lly_master_channel ON item_smart.lly_master USING btree (channel);
CREATE INDEX idx_lly_master_curr_wk ON item_smart.lly_master USING btree (current_week);
CREATE INDEX idx_lly_master_dept ON item_smart.lly_master USING btree (dept);
CREATE INDEX idx_lly_master_hcode ON item_smart.lly_master USING btree (hierarchy_code);

--changeset shreyansh.pathak@impactanalytics.co:l1_name stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.lly_master ADD COLUMN IF NOT EXISTS is_active BOOLEAN;


--changeset jaya.khandelwal@impactanalytics.co:lly_master_col_add stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: add column
ALTER TABLE item_smart.lly_master ADD COLUMN base_roq float DEFAULT NULL;
ALTER TABLE item_smart.lly_master ADD COLUMN ia_vendor_adj_roq float DEFAULT NULL;
ALTER TABLE item_smart.lly_master ADD COLUMN final_order_qty float DEFAULT NULL;


--changeset jaya.khandelwal@impactanalytics.co:lly_master__new_col stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: add column
ALTER TABLE item_smart.lly_master 
ADD COLUMN IF NOT EXISTS record_flag_update INT4;