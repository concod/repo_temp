--liquibase formatted sql
--changeset linu_nazil:rcl_constraint_master_modified stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_constraint_master
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_constraint_master (
	rcl_constraint_code serial4 not null,
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	psa_name varchar NULL,
	validity daterange NOT NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 DEFAULT 0 NOT NULL,
	max_stock float4 DEFAULT 0 NOT NULL,
	aps float4 NULL,
	ros float4 NULL,
	st float4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
	CONSTRAINT unique_ps_rcl UNIQUE (rcl_code, rule_code, psa_code, validity),
	CONSTRAINT rcl_constraint_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_constraint_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);








--changeset ujjawal.singh:rcl_constraint_master_dos stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding dos column in constraints

ALTER TABLE inventory_smart.rcl_constraint_master 
    ADD COLUMN IF NOT EXISTS psa_name varchar NULL;

ALTER TABLE inventory_smart.rcl_constraint_master 
    DROP COLUMN IF EXISTS aggr_min,
    DROP COLUMN IF EXISTS aggr_max,
    DROP COLUMN IF EXISTS min_distribution;

ALTER TABLE inventory_smart.rcl_constraint_master 
    DROP CONSTRAINT IF EXISTS rule_table_fk;
