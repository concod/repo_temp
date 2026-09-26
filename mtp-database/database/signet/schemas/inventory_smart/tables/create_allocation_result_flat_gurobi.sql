	--liquibase formatted sql
--changeset liquibase:create_allocation_result_flat_gurobi_1 stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
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
	created_at timestamptz(0) NULL DEFAULT timezone('utc'::text, now()),
	updated_by int4 NULL DEFAULT 0,
	updated_at timestamptz(0) NULL DEFAULT timezone('utc'::text, now()),
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
	shipping_date timestamptz NULL DEFAULT timezone('utc'::text, now()),
	pack_dc_allocation jsonb NULL,
	store_grade varchar NULL,
	store_name varchar NULL,
	"source" varchar NULL,
	auto_allocation_run_flag varchar NULL,
	product_profile_selected varchar NULL,
	selected_store_groups _int4 NULL,
	selected_store_group_names _varchar NULL,
	selected_store_codes _varchar NULL,
	selected_store_count int4 NULL,
	case_qty float8 NULL,
	allocated_total_orig float4 NULL,
	is_edited bool NULL DEFAULT false,
	pack_dc_allocation_original json NULL,
	order_type varchar NULL,
	delivery_dt timestamp NULL,
	sub_sku varchar NULL,
	original_forecast float4 NULL DEFAULT 0,
	constrained_forecast int8 NULL DEFAULT 0

)
PARTITION BY RANGE (created_at);
CREATE INDEX create_allocation_result_flat_gurobi_allocation_code_idx ON inventory_smart.create_allocation_result_flat_gurobi USING btree (allocation_code);
/*
do $$
declare
	_std int;
	_st timestamptz;
	_et timestamptz;
	_sql text;
begin
   for _std, _st, _et in SELECT 
	  replace(
	    (s.day :: date):: varchar, 
	    '-', 
	    ''
	  ):: int4 as start_time_date, 
	  timezone('utc', s.day) as start_time, 
	  timezone(
	    'utc', 
	    (s.day + interval '1 day')
	  ) as end_time 
	FROM 
	  generate_series(
	    current_date,
	    current_date + interval '1 year', 
	    interval '1 day'
	  ) AS s(day) loop
		_sql := 'CREATE TABLE IF NOT EXISTS inventory_smart."create_allocation_result_flat_gurobi_' || _std || '" PARTITION OF inventory_smart.create_allocation_result_flat_gurobi FOR VALUES FROM (''' || _st || ''') TO (''' || _et || ''');';
		--raise notice '_sql: %', _sql;
		execute _sql;
	end loop;
end; $$
*/

--changeset vishal.kumar@impactanalytics.co:create_allocation_result_flat_gurobi_change9 stripComments:false splitStatements:false context:release_1_2 labels:MTP-23290
--comment: adding max_supression_flag column for distinguishing exceed max

ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS max_supression_flag bool NULL DEFAULT false;

--changeset vishal.kumar@impactanalytics.co:create_allocation_result_flat_gurobi_change4_2 stripComments:false splitStatements:false context:release_1_4 labels:MTP-23363
--comment: adding lead time forecast column
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS lt_forecast int NULL DEFAULT 0;

ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS updated_oh_oo_it float4 NULL DEFAULT 0.0;

--changeset vishal.kumar@impactanalytics.co:create_allocation_result_flat_gurobi_change7 stripComments:false splitStatements:false context:release_1_5 labels:MTP-26746
--comment: adding min_influenced_allocation column for finding min satisfied allocations
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS min_influenced_allocation bool NULL DEFAULT false;

--changeset vishal.kumar@impactanalytics.co:create_allocation_result_flat_gurobi_change8 stripComments:false splitStatements:false context:release_1_6 labels:MTP-27559
--comment: adding unedited constraints 
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS  unedited_wos float4 NULL DEFAULT 1.0;
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS  unedited_min float4 NULL DEFAULT 1.0;
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS  unedited_max float4 NULL DEFAULT 1.0;


--changeset madhumitha.s@impactanalytics.co:create_allocation_index_001 stripComments:false splitStatements:false context:release_1_8 labels:MTP-27559
--comment: adding_index 

CREATE INDEX IF NOT EXISTS create_allocation_result_flat_gurobi_created_at_idx ON inventory_smart.create_allocation_result_flat_gurobi (created_at);
CREATE INDEX IF NOT EXISTS create_allocation_result_flat_gurobi_created_at_store_idx ON inventory_smart.create_allocation_result_flat_gurobi (created_at, store);
CREATE INDEX IF NOT EXISTS create_allocation_result_flat_gurobi_created_at_source_idx ON inventory_smart.create_allocation_result_flat_gurobi (created_at, "source");
CREATE INDEX IF NOT EXISTS create_allocation_result_flat_gurobi_created_at_article_idx ON inventory_smart.create_allocation_result_flat_gurobi (created_at, article);

--changeset ashish@impactanalytics.co:add_back_selected_store_codes stripComments:false splitStatements:false context:release_1_8 labels:MTP-27559
--comment: adding_selected_store_codes_back
ALTER TABLE inventory_smart.create_allocation_result_flat_gurobi ADD COLUMN IF NOT EXISTS selected_store_codes _varchar NULL;


--changeset madhumitha.s@impactanalytics.co:create_allocation_result_flat_gurobi_past_finalized_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_allocation_result_flat_gurobi_past_finalized

CREATE TABLE IF NOT EXISTS inventory_smart.create_allocation_result_flat_gurobi_past_finalized (
    LIKE inventory_smart.create_allocation_result_flat_gurobi INCLUDING ALL
)
PARTITION BY RANGE (created_at);