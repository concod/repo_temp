--liquibase formatted sql
--changeset ezhil.kannan@impactanalytics.co:assort_smart.line_plan_choice_launch_nle_dump stripComments:false splitStatements:false context:MTP-75018 labels:changes_for_line_plan_choice_launch
--comment: initial changes for line_plan_choice_launch_nle

CREATE TABLE IF NOT EXISTS assort_smart.line_plan_choice_launch_nle_dump (
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
    global_choice_id varchar(255) NULL,
    below_moq_flag int4 DEFAULT 0 NOT NULL,
    nrf_color_bucket VARCHAR NULL,
    carryover_style VARCHAR NULL,
    min_per_order VARCHAR NULL,
    marketing VARCHAR NULL,
    exit_floorset VARCHAR NULL,
    sample_request VARCHAR NULL,
    vendor_name VARCHAR NULL,
    merchant_comments VARCHAR NULL,
    planner_comments VARCHAR NULL,
    size_range_type VARCHAR NULL,
    attr_comment_1 VARCHAR NULL,
    attr_comment_2 VARCHAR NULL,
    attr_comment_3 VARCHAR NULL,
    attr_comment_4 VARCHAR NULL,
    relevant_size text NULL,
    initial_sales_date date NULL,
    style_color varchar NULL,
    flex_subclass_code VARCHAR NULL,
    flex_subclass VARCHAR NULL,
    flex_size_range VARCHAR NULL,
    is_min_depth_edited BOOLEAN DEFAULT FALSE,
    placeholder_choice_id_order INTEGER DEFAULT 0,
    outlet_smu VARCHAR NULL,
    drop_ship VARCHAR NULL,
    min_per_color VARCHAR NULL,
    global_style_id varchar(255) DEFAULT NULL,
    target_imu_per float8 DEFAULT 0,
    imu_per float8 DEFAULT 0,
    dtg_exit_date date DEFAULT NULL,
    target_retail_price float8 DEFAULT 0,
    target_cost float8 DEFAULT 0,
    nle_flag TEXT null
);


--changeset ezhil.kannan@impactanalytics.co:assort_smart.line_plan_choice_launch_nle_dump_alter_v2 stripComments:false splitStatements:false context:MTP-109177 labels:MFP_UPDATE_LINE_PLAN
--comment: Add missing columns + index for line_plan_choice_launch_nle_dump

-- Add new columns
ALTER TABLE assort_smart.line_plan_choice_launch_nle_dump
    ADD COLUMN IF NOT EXISTS is_copied bool DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS "action" varchar NULL;

-- Add index if not exists
CREATE INDEX IF NOT EXISTS line_plan_choice_launchnle_dump_temp_plan_final_level_idx
    ON assort_smart.line_plan_choice_launch_nle_dump (plan_code, final_level);
