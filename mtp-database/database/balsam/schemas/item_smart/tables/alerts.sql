
--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:alerts_chnage_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for alerts
CREATE TABLE item_smart.alerts (
	dept text NOT NULL,
	l3_name text NULL,
	channel text NOT NULL,
	sub_channel text NULL,
	"year" int4 NOT NULL,
	hierarchy_code int4 NOT NULL,
	l2_name text NULL,
	wp_written_sales_dollars numeric NULL,
	wp_written_sales_cost numeric NULL,
	wp_written_sales_unit numeric NULL,
	ty_written_sales_dollars numeric NULL,
	ly_written_sales_dollars numeric NULL,
	op_written_sales_dollars numeric NULL,
	lf_written_sales_dollars numeric NULL,
	wp_eop_units numeric NULL,
	wp_discount_rate numeric NULL,
	iaf_discount_rate numeric NULL,
	wp_auc_first_cost numeric NULL,
	ly_auc_first_cost numeric NULL,
	wp_unplaced_total_units numeric NULL,
	var_sls_u_wp_op bool NULL,
	var_sls_u_wp_op_pos bool NULL,
	var_sls_u_wp_op_neg bool NULL,
	var_sls_u_wp_lf bool NULL,
	var_sls_u_wp_lf_pos bool NULL,
	var_sls_u_wp_lf_neg bool NULL,
	var_sls_u_wp_iaf bool NULL,
	var_sls_u_wp_iaf_pos bool NULL,
	var_sls_u_wp_iaf_neg bool NULL,
	dr_var_wp_vs_iaf_pos bool NULL,
	dr_var_wp_vs_iaf_neg bool NULL,
	auc_var_wp_vs_ly_pos bool NULL,
	auc_var_wp_vs_ly_neg bool NULL,
	open_receipt_qty bool NULL,
	order_qty_moq bool NULL,
	st_pos_variance bool NULL,
	st_neg_variance bool NULL,
	"class" text NULL,
	st_var bool NULL,
	auc_var_wp_vs_ly bool NULL,
	dr_var_wp_vs_iaf bool NULL,
	CONSTRAINT pk_alerts PRIMARY KEY (dept, year, channel, hierarchy_code)
)
PARTITION BY LIST (dept);
CREATE INDEX idx_alerts_hcode ON  item_smart.alerts USING btree (hierarchy_code);

--changeset hari.krishna@impactanalytics.co:alerts stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for alerts

ALTER TABLE item_smart.alerts DROP CONSTRAINT pk_alerts;

ALTER TABLE item_smart.alerts ADD CONSTRAINT pk_alerts 
PRIMARY KEY (dept, year, channel, sub_channel, hierarchy_code);

