--liquibase formatted sql
--changeset swapnil.bhange:auto_allocation_input_backup_v1 stripComments:false splitStatements:false context:Release_1_0 labels:auto_allocation_input_backup_v1
--comment: initial changeset for auto_allocation_input_backup_v1

CREATE TABLE IF NOT EXISTS inventory_smart.auto_allocation_input_backup (
	auto_approve_flag bool NOT NULL,
	int_div varchar NOT NULL,
	user_code int4 NOT NULL,
	article_list _varchar NOT NULL DEFAULT '{}'::character varying[],
	row_num int4 NOT NULL,
	allocation_code varchar NOT NULL,
	auto_approve_no int4 NULL,
	allocation_status varchar NULL,
	updated_at timestamptz NOT NULL DEFAULT now(),
	range_name varchar NULL,
	l0_name_article_list_map jsonb NULL,
	store_groups jsonb NOT NULL DEFAULT '{}'::jsonb,
    batch_number int4 NULL,
    backup_at timestamptz DEFAULT now() NULL,
	CONSTRAINT aa_input_temp_key_bkp UNIQUE (range_name, auto_approve_flag, article_list, updated_at)
);
