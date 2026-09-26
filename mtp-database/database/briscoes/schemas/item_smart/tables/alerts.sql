
--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:alerts_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for alerts
CREATE TABLE IF NOT EXISTS item_smart.alerts (
	dept text NOT NULL,
	hierarchy_code int8 NOT NULL,
	channel text NOT NULL,
	"month" int4 NOT NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	wp_written_sales_dollars float8 NULL,
	ty_written_sales_dollars float8 NULL,
	iaf_written_sales_dollars float8 NULL,
	op_written_sales_dollars float8 NULL,
	lf_written_sales_dollars float8 NULL,
	var_sls_u_wp_op bool NULL,
	var_sls_u_wp_lf bool NULL,
	var_sls_u_wp_iaf bool NULL,
	ttl_rcpt_moq bool NULL,
	fwos_exit_date bool NULL,
	fwos_lead_time bool NULL,
	rec_rcpt_u_ttl_rcpt_u bool NULL,
	CONSTRAINT pk_alerts PRIMARY KEY (dept, month, channel, hierarchy_code)
)
PARTITION BY LIST (dept);
--changeset jaya.kahndelwal@impactanalytics.co:alerts_o1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: changeset for adding primary key and indexes
CREATE INDEX IF NOT EXISTS idx_alerts_hcode ON item_smart.alerts USING btree (hierarchy_code);

