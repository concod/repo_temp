--liquibase formatted sql
--changeset rajesh.kumar:rcl_po_store_policy_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_po_store_policy_1
CREATE TABLE inventory_smart.rcl_po_store_policy (
	rcl_dc_store_policy_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	default_store_groups _int4 DEFAULT ARRAY[]::integer[] NULL,
	default_product_profile int4 NULL,
	dc_store_rule int4 NULL,
	auto_allocation_rule int4 NULL,
	auto_allocation_schedular int4 NULL,
	validity daterange NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	is_deleted bool DEFAULT false NULL,
	CONSTRAINT unique_po_dsp_rcl UNIQUE (rcl_code, rule_code, validity),
	CONSTRAINT rcl_po_store_policy_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_po_store_policy_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);