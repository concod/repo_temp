--liquibase formatted sql
--changeset linu_nazil:rcl_constraint_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_constraint_master
CREATE TABLE inventory_smart.rcl_constraint_master (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	psa_name varchar NOT NULL,
	validity datemultirange NOT NULL,
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
	CONSTRAINT unique_ps_rcl UNIQUE (rcl_code, rule_code, psa_code),
	CONSTRAINT rcl_constraint_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_constraint_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);

--liquibase formatted sql
--changeset ashish_gupta:rcl_constraint_master_updated stripComments:false splitStatements:false context:Release_1_0 labels:column_added
ALTER TABLE inventory_smart.rcl_constraint_master ALTER COLUMN psa_name DROP NOT NULL;

--changeset linu.nazil:rcl_constraint_master_val stripComments:false splitStatements:false context:Release_1_0 labels:new_column
--comment: modification for rcl_constraint_master
ALTER TABLE inventory_smart.rcl_constraint_master ALTER COLUMN validity type daterange using daterange(lower(validity), upper(validity));
--changeset linu.nazil:rcl_constraint_master_seq stripComments:false splitStatements:false context:Release_1_0 labels:new_seq
--comment: modification for rcl_constraint_master
ALTER TABLE inventory_smart.rcl_constraint_master ADD COLUMN IF NOT EXISTS rcl_constraint_code int4 NOT NULL;
CREATE SEQUENCE IF NOT EXISTS inventory_smart.rcl_constraint_master_rcl_constraint_code_seq;
ALTER TABLE inventory_smart.rcl_constraint_master ALTER COLUMN rcl_constraint_code SET DEFAULT nextval('inventory_smart.rcl_constraint_master_rcl_constraint_code_seq');
--changeset linu.nazil:rcl_constraint_master_uk stripComments:false splitStatements:false context:Release_1_0 labels:new_seq
--comment: modification for rcl_constraint_master
ALTER TABLE inventory_smart.rcl_constraint_master DROP CONSTRAINT if exists unique_ps_rcl;
ALTER TABLE inventory_smart.rcl_constraint_master add CONSTRAINT unique_ps_rcl UNIQUE (rcl_code, rule_code, psa_code, validity);
--changeset shashwat.yadav:added_is_deleted stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modification for added_is_deleted
ALTER TABLE inventory_smart.rcl_constraint_master ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;