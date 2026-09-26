--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:auto_allocation_input stripComments:false splitStatements:false context:VS_inv_smart labels:VS-643
--comment: initial changeset for auto_allocation_input
CREATE TABLE IF NOT EXISTS inventory_smart.auto_allocation_input (
	brand varchar NULL,
	category varchar NULL,
	"class" varchar NULL,
	sub_class varchar NULL,
	auto_approve_flag bool NULL,
	int_div int8 NULL,
	total_article_count int8 NULL,
	article_count_per_row int8 NULL,
	article_list _varchar NULL,
	user_code int4 NULL,
	row_num int8 NULL,
	allocation_code text NULL
);


--changeset kamuju.mahaveer@impactanalytics.co:auto_allocation_input_v1 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: Added Auto release flag
ALTER TABLE inventory_smart.auto_allocation_input  ADD COLUMN IF NOT EXISTS auto_release_flag bool NULL;


--changeset kamuju.mahaveer@impactanalytics.co:auto_allocation_input_v2 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132
--comment: Added Auto release flag
ALTER TABLE inventory_smart.auto_allocation_input RENAME COLUMN auto_release_flag TO auto_release;

--changeset arjun.pp@impactanalytics.co:add_allocation_status_and_updated_at_columns stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-132_status
--comment: add allocation_status and updated_at columns
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS allocation_status varchar;
ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS updated_at timestamptz not null default now();


--changeset osho.sharma@impactanalytics.co:add_error_message_column stripComments:false splitStatements:false context:auto_allocation_input labels:auto_allocation_input_error_capture
--comment: MTP-137923 - Add error_message column to capture failure reasons for auto allocations

ALTER TABLE inventory_smart.auto_allocation_input ADD COLUMN IF NOT EXISTS error_message TEXT NULL DEFAULT NULL;
