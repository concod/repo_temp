--liquibase formatted sql
--changeset suchithra.pr@impactanalytics.co:alerts stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for alerts
CREATE TABLE item_smart.alerts (
	dept text NOT NULL,
	"class" text NOT NULL,
	channel text NOT NULL,
	"month" int8 NOT NULL,
	hierarchy_code int8 NOT NULL,
	collection_name text NOT NULL,
	wp_written_sales_dollars float8 NULL,
	wp_written_sales_cost float8 NULL,
	wp_atp_cost float8 NULL,
	ty_written_sales_dollars float8 NULL,
	ly_written_sales_dollars float8 NULL,
	op_written_sales_dollars float8 NULL,
	lf_written_sales_dollars float8 NULL,
	var_sls_u_wp_op bool NULL,
	var_sls_u_wp_lf bool NULL,
	var_sls_u_wp_iaf bool NULL,
	rec_rcpt_u_ttl_rcpt_u bool NULL,
	ttl_rcpt_moq bool NULL,
	fwos_exit_date bool NULL,
	fwos_lead_time bool NULL
)
PARTITION BY LIST (dept);

--changeset jaya.khandelwal@impactanalytics.co:alerts_1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: changeset for adding primary key and indexes
ALTER TABLE item_smart.alerts ADD CONSTRAINT pk_alerts PRIMARY KEY (dept, month, channel, hierarchy_code);
CREATE INDEX idx_alerts_hcode ON item_smart.alerts USING btree (hierarchy_code);   