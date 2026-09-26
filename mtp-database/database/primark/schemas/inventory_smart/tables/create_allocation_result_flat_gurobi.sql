--liquibase formatted sql
--changeset liquibase:create_allocation_result_flat_gurobi stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_allocation_result_flat_gurobi

CREATE TABLE IF NOT EXISTS inventory_smart.create_allocation_result_flat_gurobi (
	article varchar NULL,
	"style" varchar NULL,
	style_description varchar NULL,
	color varchar NULL,
	color_code varchar NULL,
	retail_size_cd varchar NULL,
	inv_avai float4 NULL,
	inventory_source varchar NULL,
	store varchar NULL,
	demand_type varchar NULL,
	demand float4 NULL,
	size_curve float4 NULL,
	split_profile float4 NULL,
	ros float4 NULL,
	min float4 NULL,
	oh float4 NULL,
	oo float4 NULL,
	it float4 NULL,
	oh_oo_intransit float4 NULL,
	min_unfulfilled float4 NULL,
	max_orig float4 NULL,
	max float4 NULL,
	wos float4 NULL,
	wk_count_final float4 NULL,
	allocated_total float4 NULL,
	allocation_code varchar NULL,
	created_by int4 NULL,
	created_at timestamptz(0) DEFAULT timezone('utc'::text, now()) NULL,
	updated_by int4 DEFAULT 0 NULL,
	updated_at timestamptz(0) DEFAULT timezone('utc'::text, now()) NULL,
	special_classification varchar NULL,
	status int4 NULL,
	is_deleted bool NULL,
	final_inv_available float4 NULL,
	aps float4 NULL,
	description varchar NULL,
	"order" float4 NULL,
	new_size text NULL,
	created_by_username text NULL,
	updated_by_username text NULL,
	dc_codes _varchar NULL,
	shipping_date timestamptz DEFAULT timezone('utc'::text, now()) NULL,
	pack_dc_allocation jsonb NULL,
	store_grade varchar NULL,
	store_name varchar NULL,
	"source" varchar NULL,
	auto_allocation_run_flag varchar NULL,
	product_profile_selected varchar NULL,
	selected_store_groups _int4 NULL,
	selected_store_group_names _varchar NULL,
	selected_store_count int4 NULL,
	case_qty float8 NULL,
	allocated_total_orig float4 NULL,
	is_edited bool DEFAULT false NULL,
	pack_dc_allocation_original json NULL,
	order_type varchar NULL,
	delivery_dt timestamp NULL,
	original_forecast float4 DEFAULT 0 NULL,
	constrained_forecast int8 DEFAULT 0 NULL,
	max_supression_flag bool DEFAULT false NULL,
	lt_forecast int4 DEFAULT 0.0 NULL,
	updated_oh_oo_it float4 DEFAULT 0.0 NULL,
	min_influenced_allocation bool DEFAULT false NULL,
	unedited_wos float4 DEFAULT 1.0 NULL,
	unedited_min float4 DEFAULT 1.0 NULL,
	unedited_max float4 DEFAULT 1.0 NULL,
	order_priority int8 DEFAULT 2 NULL
)
PARTITION BY RANGE (created_at);
CREATE INDEX cafrg_article_idx ON inventory_smart.create_allocation_result_flat_gurobi USING btree (article);
CREATE INDEX create_allocation_result_flat_gurobi_allocation_code_idx ON inventory_smart.create_allocation_result_flat_gurobi USING btree (allocation_code);

--changeset ashish.gupta:create_allocation_result_flat_gurobi stripComments:false splitStatements:false context:VS_Needs labels:Internally_demanded
--comment: initial changeset for create_allocation_result_flat_gurobi
CREATE SEQUENCE IF NOT EXISTS inventory_smart.allocation_plan_sequence
AS bigint
	INCREMENT BY 1
	MINVALUE 1
	START 100000
	CACHE 1
	NO CYCLE;

--changeset linu.nazil@impactanalytics.co:create_allocation_result_flat_gurobi_change11 stripComments:false splitStatements:false context:release_1_8 labels:MTP-62469
--comment: Add ticket_type column
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS  ticket_type varchar DEFAULT '10_Standard';
--changeset surendra.babu@impactanalytics.co:create_allocation_result_flat_gurobi stripComments:false splitStatements:false context:Release_1_0 labels:MTP-64854
--comment: Added allocation_strategy column
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS  allocation_strategy varchar DEFAULT 'min_forecast';

--changeset aniruddh.singh@impactanalytics.co:create_allocation_result_flat_gurobi stripComments:false splitStatements:false context:Release_1_0 labels:MTP-77903
--comment: Added store_start_date, store_end_date column
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi
ADD COLUMN IF NOT EXISTS store_start_date timestamp NULL,
ADD COLUMN IF NOT EXISTS store_end_date timestamp NULL;

--changeset madhumitha.s@impactanalytics.co:create_allocation_index_001 stripComments:false splitStatements:false context:release_1_8 labels:MTP-27559
--comment: adding_index 

CREATE INDEX IF NOT EXISTS create_allocation_result_flat_gurobi_created_at_idx ON inventory_smart.create_allocation_result_flat_gurobi (created_at);
CREATE INDEX IF NOT EXISTS create_allocation_result_flat_gurobi_created_at_store_idx ON inventory_smart.create_allocation_result_flat_gurobi (created_at, store);
CREATE INDEX IF NOT EXISTS create_allocation_result_flat_gurobi_created_at_source_idx ON inventory_smart.create_allocation_result_flat_gurobi (created_at, "source");
CREATE INDEX IF NOT EXISTS create_allocation_result_flat_gurobi_created_at_article_idx ON inventory_smart.create_allocation_result_flat_gurobi (created_at, article);

--changeset madhumitha.s@impactanalytics.co:create_allocation_result_flat_gurobi_past_finalized stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_allocation_result_flat_gurobi_past_finalized

CREATE TABLE inventory_smart.create_allocation_result_flat_gurobi_past_finalized (
    LIKE inventory_smart.create_allocation_result_flat_gurobi INCLUDING ALL
)
PARTITION BY RANGE (created_at);

--changeset aniruddh.singh@impactanalytics.co:add_dos_selected_store_codes_and_store_cluster stripComments:false splitStatements:false context:release_store_cluster labels:MTP-82337
--comment: adding dos, selected_store_codes and store_cluster to align with base schema
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi
ADD COLUMN IF NOT EXISTS dos INT NULL DEFAULT 1;

ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi
ADD COLUMN IF NOT EXISTS selected_store_codes _varchar NULL;

ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi
ADD COLUMN IF NOT EXISTS store_cluster VARCHAR NULL;

--changeset shekharkrishna.nirnakar@impactanalytics.co:add_is_scenario_column_to_carfg stripComments:false splitStatements:false context:release_ticket_type labels:MTP-130927
--comment: Add is_scenario boolean column to create_allocation_result_flat_gurobi table to track records updated via Scenario Plan merges
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi 
ADD COLUMN IF NOT EXISTS is_scenario BOOLEAN DEFAULT false;