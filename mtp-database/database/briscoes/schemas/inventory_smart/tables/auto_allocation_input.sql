--liquibase formatted sql
--changeset samridhi.gupta@impactanalytics.co:sync_auto_allocation_input_table stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_auto_allocation_input
--comment: initial changeset for sync_auto_allocation_input
--rollback: SELECT 1


CREATE table if not exists inventory_smart.auto_allocation_input (
 sales_org_name varchar not null,
	  category varchar not null,
	  sub_category varchar not null,
	  brand varchar not null,
	  merchandise_category varchar not null,
	  article varchar not null,
	  auto_approve_flag bool not null,
	  int_div varchar not null,
      user_code int4 not  null,
      total_style_count int4 null,
	  style_count_per_row int4 null,
	  article_list varchar DEFAULT '{}'::character varying[] not null,
	  row_num int4 not null,
      allocation_code varchar not null,

	CONSTRAINT auto_allocation_input_key UNIQUE (sales_org_name, category, sub_category, brand, merchandise_category, article, auto_approve_flag, int_div, article_list)
	);

--changeset samridhi.gupta@impactanalytics.co:article_list_correcn stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_auto_allocation_input
--comment: initial changeset for sync_auto_allocation_input
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS article_list;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS article_list _varchar DEFAULT '{}'::character varying[] not null;

--changeset samridhi.gupta@impactanalytics.co:article_col_drop stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_auto_allocation_input
--comment: initial changeset for sync_auto_allocation_input
ALTER TABLE inventory_smart.auto_allocation_input DROP COLUMN IF EXISTS article;

--changeset samridhi.gupta@impactanalytics.co:auto_approve_num stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_auto_allocation_input
--comment: initial changeset for sync_auto_allocation_input
ALTER TABLE inventory_smart.auto_allocation_input ADD  COLUMN IF NOT EXISTS auto_approve_no int4 null;

--changeset samridhi.gupta@impactanalytics.co:auto_release_flag_pr_correction stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_auto_allocation_input
--comment: initial changeset for auto_release_flag_pr_correction
ALTER TABLE inventory_smart.auto_allocation_input ADD  COLUMN IF NOT EXISTS auto_release bool null;

--changeset arjun.pp@impactanalytics.co:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_auto_allocation_input
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS allocation_status varchar;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();

--changeset navin.chandan@impactanalytics.co:add_type_and_alloc_type stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_auto_allocation_input
--comment: add columns type and alloc_type
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS type int4;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS alloc_type varchar;

--changeset samarjit.mazumder@impactanalytics.co:add_batch_number stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_auto_allocation_input
--comment: add columns batch_number
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS batch_number int4 NULL;

--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
