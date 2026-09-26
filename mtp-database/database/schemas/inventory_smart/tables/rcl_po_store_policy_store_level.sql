--liquibase formatted sql
--changeset tarun.tyagi:rcl_po_store_policy_store_level_2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-112857
--comment: initial changeset for rcl_po_store_policy_store_level
CREATE TABLE IF NOT EXISTS inventory_smart.rcl_po_store_policy_store_level (
	rcl_po_store_policy_store_level_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	validity daterange NOT NULL,
	store_code varchar NOT NULL,
	store_name varchar NOT NULL,
	channel varchar NULL,
	auto_allocation_schedular int4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT unique_posp_rcl_store_level UNIQUE (rcl_code, rule_code, validity, store_code),
	CONSTRAINT rcl_po_store_policy_store_level_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_po_store_policy_store_level_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);

-- No changeset needed as per the instructions