--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:alerts_1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for alerts
CREATE TABLE IF NOT EXISTS item_smart.alerts (
	country text NOT NULL,
	hierarchy_code numeric NOT NULL,
	channel text NOT NULL,
	"month" int4 NOT NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	wp_written_sales_dollars float4 NULL,
	ty_written_sales_dollars float4 NULL,
	iaf_written_sales_dollars float4 NULL,
	op_written_sales_dollars float4 NULL,
	lf_written_sales_dollars float4 NULL,
	var_sls_u_wp_op bool NULL,
	var_sls_u_wp_lf bool NULL,
	var_sls_u_wp_iaf bool NULL,
	ttl_rcpt_moq bool NULL,
	fwos_exit_date bool NULL,
	fwos_lead_time bool NULL,
	rec_rcpt_u_ttl_rcpt_u bool NULL,
	CONSTRAINT alerts_pk PRIMARY KEY (country, channel, month, hierarchy_code)
)
PARTITION BY LIST (country);

--changeset sonika.baheti@impactanalytics.co:alers stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  rename columns

ALTER TABLE item_smart.alerts RENAME COLUMN country TO dept;

--changeset shreyansh.pathak@impactanalytics.co:alerts_v4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for hierarchy code column

ALTER TABLE item_smart.alerts ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;

--changeset shreyansh.pathak@impactanalytics.co:alerts_v5 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.alerts ALTER COLUMN wp_written_sales_dollars TYPE float8 USING wp_written_sales_dollars::float8;
ALTER TABLE item_smart.alerts ALTER COLUMN ty_written_sales_dollars TYPE float8 USING ty_written_sales_dollars::float8;
ALTER TABLE item_smart.alerts ALTER COLUMN iaf_written_sales_dollars TYPE float8 USING iaf_written_sales_dollars::float8;
ALTER TABLE item_smart.alerts ALTER COLUMN op_written_sales_dollars TYPE float8 USING op_written_sales_dollars::float8;
ALTER TABLE item_smart.alerts ALTER COLUMN lf_written_sales_dollars TYPE float8 USING lf_written_sales_dollars::float8;

--changeset jaya.khandelwal@impactanalytics.co:alerts_1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: changeset for adding primary key and indexes
ALTER TABLE item_smart.alerts DROP CONSTRAINT alerts_pk;
ALTER TABLE item_smart.alerts ADD CONSTRAINT pk_alerts PRIMARY KEY (dept,  month, channel, hierarchy_code);
CREATE INDEX idx_alerts_hcode ON item_smart.alerts USING btree (hierarchy_code);
