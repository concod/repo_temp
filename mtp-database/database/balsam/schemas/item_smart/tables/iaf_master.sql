--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:iaf_master_chg_new stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for iaf_master
CREATE TABLE if not exists item_smart.iaf_master (
	hierarchy_code int4 NULL,
	compared_week int4 NULL,
	current_week int4 NULL,
	channel text NULL,
	sub_channel text NULL,
	dept text NULL,
	revenue numeric NULL,
	sales_units numeric NULL,
	air numeric NULL,
	discount_rate_perc numeric NULL,
	imu_perc numeric NULL,
	asp numeric NULL,
	sales_cogs numeric NULL,
	auc numeric NULL,
	auc_first numeric NULL,
	auc_landed numeric NULL,
	auc_fully_loaded numeric NULL,
	gm_perc numeric NULL,
	gm_dollar numeric NULL,
	bop_units numeric NULL,
	bop_cost numeric NULL,
	bop_auc numeric NULL,
	eop_units numeric NULL,
	eop_cost numeric NULL,
	eop_auc numeric NULL,
	total_receipt_units numeric NULL,
	total_receipt_dollar numeric NULL,
	total_receipt_auc numeric NULL,
	on_order_receipt_units numeric NULL,
	on_order_receipt_dollar numeric NULL,
	to_be_placed_units numeric NULL,
	to_be_placed_cost numeric NULL,
	recommended_u_supply numeric NULL,
	total_supply_plan numeric NULL,
	recommended_receipt_units numeric NULL,
	target_sellthrough_perc numeric NULL,
	forecasted_sellthrough_perc numeric NULL,
	rtp_perc_sales_units numeric NULL,
	return_to_prime_units numeric NULL,
	return_to_prime_dollar numeric NULL,
	warranty_perc_sales_units numeric NULL,
	warranty_units numeric NULL,
	warranty_dollar numeric NULL,
	zero_dollar_orders_perc_sales_units numeric NULL,
	zero_dollar_orders_units numeric NULL,
	zero_dollar_orders_dollar numeric NULL,
	container_count numeric NULL,
	moq numeric NULL,
	fwos numeric NULL,
	discount_perc float4 NULL,
	to_be_placed_dollar int4 NULL,
	rtp_sales_units_perc float4 NULL,
	rtp_units varchar(50) NULL,
	rtp_dollar varchar(50) NULL,
	warranty_sales_units_perc float4 NULL,
	zero_dollar_orders_perc float4 NULL,
	pr_units varchar(50) NULL,
	pr_dollar varchar(50) NULL,
	written_sales_dollars numeric NULL,
	written_auc numeric NULL,
	total_receipt_cost numeric NULL,
	on_order_placed_total_unit numeric NULL,
	on_order_placed_total numeric NULL,
	recomm_receipt_units numeric NULL,
	written_sales_units numeric NULL,
	written_air numeric NULL,
	written_dr_perc numeric NULL,
	written_imu numeric NULL,
	written_sales_cost numeric NULL,
	written_gm_perc numeric NULL,
	written_gm_dollar numeric NULL,
	written_aur numeric NULL,
	discount numeric NULL,
	scenario numeric NULL,
	on_order_placed_total_auc numeric NULL,
	on_order_placed_total_cost numeric NULL,
	on_order_unplaced_total_auc numeric NULL,
	on_order_unplaced_total_cost numeric NULL,
	recomm_receipt_auc numeric NULL,
	recomm_receipt_msrp numeric NULL,
	recomm_receipt_msrp_per_unit numeric NULL,
	on_order_unplaced_total_unit numeric NULL,
	on_order_unplaced_total numeric NULL,
	fully_loaded_cost numeric NULL,
	is_active bool NULL,
	actualised bool NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by text NULL,
	updated_by text NULL
)
PARTITION BY LIST (dept);
CREATE INDEX if not exists idx_iaf_master_channel ON  item_smart.iaf_master USING btree (sub_channel);
CREATE INDEX if not exists idx_iaf_master_curr_wk ON item_smart.iaf_master USING btree (current_week);
CREATE INDEX if not exists idx_iaf_master_dept ON item_smart.iaf_master USING btree (dept);
CREATE INDEX if not exists idx_iaf_master_hcode ON  item_smart.iaf_master USING btree (hierarchy_code);

--changeset jaya.khandelwal@impactanalytics.co:iaf_master_chg2 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for iaf_master
ALTER TABLE item_smart.iaf_master ALTER COLUMN rtp_dollar TYPE float8 USING rtp_dollar::float8;
ALTER TABLE item_smart.iaf_master ALTER COLUMN pr_units TYPE float8 USING pr_units::float8;
ALTER TABLE item_smart.iaf_master ALTER COLUMN pr_dollar TYPE float8 USING pr_dollar::float8;
ALTER TABLE item_smart.iaf_master ALTER COLUMN rtp_units TYPE float8 USING rtp_units::float8;
ALTER TABLE item_smart.iaf_master ADD CONSTRAINT pk_iaf_master PRIMARY KEY (dept, current_week, channel, sub_channel, hierarchy_code);



--changeset jaya.khandelwal@impactanalytics.co:iaf_master_index stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for iaf_master
DROP INDEX IF EXISTS item_smart.idx_iaf_master_channel;
CREATE INDEX IF NOT EXISTS idx_iaf_master_channel ON item_smart.iaf_master USING btree (channel);
CREATE INDEX IF NOT EXISTS idx_iaf_master_sub_channel ON item_smart.iaf_master USING btree (sub_channel);

--changeset jaya.khandelwal@impactanalytics.co:iaf_master_data_type stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for iaf_master
ALTER TABLE item_smart.iaf_master ALTER COLUMN revenue TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN sales_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN air TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN discount_rate_perc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN imu_perc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN asp TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN sales_cogs TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN auc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN auc_first TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN auc_landed TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN auc_fully_loaded TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN gm_perc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN gm_dollar TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN bop_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN bop_cost TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN bop_auc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN eop_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN eop_cost TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN eop_auc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN total_receipt_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN total_receipt_dollar TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN total_receipt_auc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_receipt_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_receipt_dollar TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN to_be_placed_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN to_be_placed_cost TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN recommended_u_supply TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN total_supply_plan TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN recommended_receipt_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN target_sellthrough_perc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN forecasted_sellthrough_perc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN rtp_perc_sales_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN return_to_prime_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN return_to_prime_dollar TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN warranty_perc_sales_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN warranty_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN warranty_dollar TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN zero_dollar_orders_perc_sales_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN zero_dollar_orders_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN zero_dollar_orders_dollar TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN container_count TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN moq TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN fwos TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_sales_dollars TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_auc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN total_receipt_cost TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_placed_total_unit TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_placed_total TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN recomm_receipt_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_sales_units TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_air TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_dr_perc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_imu TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_sales_cost TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_gm_perc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_gm_dollar TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN written_aur TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN discount TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN scenario TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_placed_total_auc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_placed_total_cost TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_unplaced_total_auc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_unplaced_total_cost TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN recomm_receipt_auc TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN recomm_receipt_msrp TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN recomm_receipt_msrp_per_unit TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_unplaced_total_unit TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN on_order_unplaced_total TYPE float;
ALTER TABLE item_smart.iaf_master ALTER COLUMN fully_loaded_cost TYPE float;

