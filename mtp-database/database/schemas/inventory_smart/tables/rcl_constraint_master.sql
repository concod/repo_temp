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

--changeset linu_nazil:rcl_constraint_master_dos stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding dos column in constraints
ALTER TABLE inventory_smart.rcl_constraint_master ADD COLUMN dos float4 null;

--changeset linu_nazil:rcl_constraint_master_psa_name stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: removing psa_name column from constraints
ALTER TABLE inventory_smart.rcl_constraint_master DROP COLUMN IF EXISTS psa_name;

--changeset linu_nazil:rcl_constraint_master_fk_on_rule_code stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding fk on rule_code
ALTER TABLE inventory_smart.rcl_constraint_master ADD CONSTRAINT rule_table_fk FOREIGN KEY (rcl_code, rule_code) REFERENCES inventory_smart.rcl_constraint_master_rule(rcl_code, rule_code);

--changeset linu_nazil:rcl_constraint_master_aggr_min_max stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding aggr_min and aggr_max columns in constraints. This is specific to pacsun.
ALTER table inventory_smart.rcl_constraint_master ADD COLUMN IF NOT EXISTS aggr_min float4 NULL;
ALTER table inventory_smart.rcl_constraint_master ADD COLUMN IF NOT EXISTS aggr_max float4 NULL;

--changeset akash.bhandari:rcl_constraint_master_min_distribution stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding min_distribution column in constraints
ALTER TABLE inventory_smart.rcl_constraint_master ADD COLUMN min_distribution varchar null;