--liquibase formatted sql
--changeset linu.nazil:rcl_dc_store_policy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_dc_store_policy
CREATE TABLE inventory_smart.rcl_dc_store_policy (
	rcl_dc_store_policy_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	default_store_groups _int4 DEFAULT ARRAY[]::integer[] NULL,
	default_product_profile int4 null,
	dc_store_rule int4 null,
	auto_allocation_rule int4 null,
	auto_allocation_schedular int4 null,
	validity daterange NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	CONSTRAINT unique_dsp_rcl UNIQUE (rcl_code, rule_code, validity),
	CONSTRAINT rcl_dc_store_policy_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_dc_store_policy_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);

--changeset shashwat.yadav:added_is_deleted_rcl_dc_store_policy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modification for added_is_deleted_rcl_dc_store_policy
ALTER TABLE inventory_smart.rcl_dc_store_policy ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;