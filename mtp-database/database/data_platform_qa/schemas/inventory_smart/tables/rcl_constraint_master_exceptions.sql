--liquibase formatted sql
--changeset ashish_gupta:rcl_constraint_master_exceptions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_constraint_master_exceptions
CREATE TABLE inventory_smart.rcl_constraint_master_exceptions (
	rcl_code int4 NOT NULL,
	rule_code int,
	validity datemultirange NOT NULL,
	store_code varchar NOT NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 NOT NULL DEFAULT 0,
	max_stock float4 NOT NULL DEFAULT 0,
	aps float4 NULL,
	ros float4 NULL,
	st float4 NULL,
	psa_name varchar null,
	psa_code varchar null,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL
) PARTITION BY LIST (rcl_code);
ALTER TABLE "inventory_smart".rcl_constraint_master_exceptions ADD CONSTRAINT rcl_constraint_master_exceptions_fk FOREIGN KEY (rcl_code) REFERENCES global.rcl_master(rcl_code) ON DELETE RESTRICT;
ALTER TABLE "inventory_smart".rcl_constraint_master_exceptions ADD CONSTRAINT rcl_constraint_master_exceptions_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;
ALTER TABLE "inventory_smart".rcl_constraint_master_exceptions ADD CONSTRAINT rcl_constraint_master_exceptions_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;

ALTER TABLE inventory_smart.rcl_constraint_master_exceptions ADD CONSTRAINT rcl_constraint_master_exceptions_store_master_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

CREATE INDEX rcl_constraint_master_exceptions_product_code_idx ON inventory_smart.rcl_constraint_master_exceptions (store_code);

-- CREATE INDEX rcl_constraint_master_exceptions_rcl_dimention_idx ON inventory_smart.rcl_constraint_master_exceptions USING HASH (md5(rcl_dimention::text));

--changeset linu.nazil:rcl_constraint_master_exceptions_val stripComments:false splitStatements:false context:Release_1_0 labels:new_column
--comment: modification for rcl_constraint_master_exceptions
ALTER TABLE inventory_smart.rcl_constraint_master_exceptions ALTER COLUMN validity type daterange using daterange(lower(validity), upper(validity));

--changeset Shaik.azmathulla:rcl_constraint_master_exceptions_val2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-67111
--comment: created new index rcl_constraint_master_exceptions_gist_index on rcl_constraint_master_exceptions
CREATE INDEX IF NOT EXISTS rcl_constraint_master_exceptions_gist_index
    ON inventory_smart.rcl_constraint_master_exceptions USING gist 
    (validity);
