--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:fixed_changeset_issue stripComments:false splitStatements:false context:fixed_changeset_issue labels:changes_for_line_plan_choice_launch
--comment: Fixed changeset issue

CREATE TABLE IF NOT EXISTS assort_smart.line_plan_choice_launch (
	id bigserial NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code varchar NOT NULL,
	final_level varchar NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	gender varchar NULL,
	season_code varchar NULL,
	placeholder_choice_id varchar NOT NULL,
	placeholder_style_id varchar NOT NULL,
	image_name_url varchar NULL,
	style_id varchar NULL,
	color_id varchar NULL,
	style_name varchar NULL,
	color_name varchar NULL,
	style_tag varchar NULL,
	launch varchar NULL,
	launch_start_date date NULL,
	launch_end_date date NULL,
	split_by_delivery bool NULL,
	delivery_count int4 NULL,
	product_launch_date date NULL,
	product_exit_date date NULL,
	launch_season varchar NULL,
	"attributes" jsonb NULL,
	cluster_code varchar NULL,
	cluster_display_name varchar NULL,
	cluster_store_count int4 NULL,
	flow_cluster_perc float8 DEFAULT 0.0 NULL,
	total_inv_units jsonb NULL,
	sales_units jsonb NULL,
	receipt_units jsonb NULL,
	receipts_price_per_unit jsonb NULL,
	aps jsonb NULL,
	sales jsonb NULL,
	receipts jsonb NULL,
	st jsonb NULL,
	avg_wk_cnt jsonb NULL,
	gross_margin jsonb NULL,
	aur jsonb NULL,
	air jsonb NULL,
	aic jsonb NULL,
	last_season jsonb NULL,
	is_deleted bool DEFAULT false NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	global_choice_id int4 NULL,
	below_moq_flag int4 DEFAULT 0 NOT NULL
);
CREATE INDEX IF NOT EXISTS line_plan_choice_launch_temp_plan_final_level_idx ON assort_smart.line_plan_choice_launch USING btree (plan_code, final_level);

--changeset mayank.bhardwaj@impactanalytics.co:line_plan_choice_launch_changes stripComments:false splitStatements:false context:MTP-87993 labels:new_column_added_for_caters_changes
--comment: column add to line_plan_choice_launch_changes
ALTER TABLE IF EXISTS assort_smart.line_plan_choice_launch
ALTER COLUMN global_choice_id TYPE VARCHAR(255) USING global_choice_id::VARCHAR;

--changeset paras.jain@impactanalytics.co:Adding_relevant_size_col stripComments:false splitStatements:false context:MTP-91217_Adding_relevant_size_col labels:Adding_relevant_size_col
--comment: MTP_91219_Adding_relevant_size_col
    ALTER TABLE  IF EXISTS  assort_smart.line_plan_choice_launch
    ADD COLUMN relevant_size text NULL;

--changeset mayank.bhardwaj@impactanalytics.co:Adding_initial_sales_date_col stripComments:false splitStatements:false context:MTP-91217_Adding_initial_sales_date_col labels:Adding_initial_sales_date_col
--comment: MTP_91219_Adding_initial_sales_date_col
ALTER TABLE IF EXISTS assort_smart.line_plan_choice_launch
ADD COLUMN initial_sales_date date NULL;

--changeset jayabharath.reddy@impactanalytics.co:adding_global_style_id_column stripComments:false splitStatements:false context:MTP-109340 labels:Adding_
--comment: adding_imu_columns
ALTER TABLE IF EXISTS assort_smart.line_plan_choice_launch
ADD COLUMN IF NOT EXISTS global_style_id varchar(255) DEFAULT NULL;

--changeset hemanth.cs@impactanalytics.co:adding_style_color_column stripComments:false splitStatements:false context:MTP-97601 labels:Adding_imu_cols
--comment: adding_imu_columns
ALTER TABLE IF EXISTS assort_smart.line_plan_choice_launch
ADD COLUMN IF NOT EXISTS target_imu_per float8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS imu_per float8 DEFAULT 0;