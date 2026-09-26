--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co:assort_smart.line_plan_choice_launch stripComments:false splitStatements:false context:MTP-75018_new_columns labels:changes_for_line_plan_choice_launch_new_columns
--comment: changes for line_plan_choice_launch partition and new columns

CREATE TABLE assort_smart.line_plan_choice_launch (
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
    attributes jsonb NULL,
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
    nrf_color_bucket varchar NULL,
    carryover_style varchar NULL,
    min_per_order varchar NULL,
    marketing varchar NULL,
    exit_floorset varchar NULL,
    sample_request varchar NULL,
    vendor_name varchar NULL,
    merchant_comments varchar NULL,
    planner_comments varchar NULL,
    size_range_type varchar NULL,
    attr_comment_1 varchar NULL,
    attr_comment_2 varchar NULL,
    attr_comment_3 varchar NULL,
    attr_comment_4 varchar NULL,
    relevant_size text NULL,
    initial_sales_date date NULL,
    style_color varchar NULL,
    flex_subclass_code varchar NULL,
    flex_subclass varchar NULL,
    flex_size_range varchar NULL,
    is_min_depth_edited boolean DEFAULT FALSE,
    placeholder_choice_id_order integer DEFAULT 0,
    outlet_smu varchar NULL,
    drop_ship varchar NULL,
    min_per_color varchar NULL,
    global_style_id varchar(255) DEFAULT NULL,
    target_imu_per float8 DEFAULT 0,
    imu_per float8 DEFAULT 0,
    dtg_exit_date date DEFAULT NULL,
    target_cost float8 DEFAULT 0,
    target_retail_price float8 DEFAULT 0,
    sales_units_season NUMERIC GENERATED ALWAYS AS ((sales_units->>'season')::numeric) STORED,
    sales_units_lifecycle NUMERIC GENERATED ALWAYS AS ((sales_units->>'lifecycle')::numeric) STORED,
    sales_units_season_reco NUMERIC GENERATED ALWAYS AS ((sales_units->>'season_reco')::numeric) STORED,
    sales_units_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((sales_units->>'lifecycle_reco')::numeric) STORED,
    receipt_units_season NUMERIC GENERATED ALWAYS AS ((receipt_units->>'season')::numeric) STORED,
    receipt_units_lifecycle NUMERIC GENERATED ALWAYS AS ((receipt_units->>'lifecycle')::numeric) STORED,
    receipt_units_season_reco NUMERIC GENERATED ALWAYS AS ((receipt_units->>'season_reco')::numeric) STORED,
    receipt_units_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((receipt_units->>'lifecycle_reco')::numeric) STORED,
    sales_season NUMERIC GENERATED ALWAYS AS ((sales->>'season')::numeric) STORED,
    sales_lifecycle NUMERIC GENERATED ALWAYS AS ((sales->>'lifecycle')::numeric) STORED,
    gross_margin_season NUMERIC GENERATED ALWAYS AS ((gross_margin->>'season')::numeric) STORED,
    gross_margin_lifecycle NUMERIC GENERATED ALWAYS AS ((gross_margin->>'lifecycle')::numeric) STORED,
    aps_season NUMERIC GENERATED ALWAYS AS ((aps->>'season')::numeric) STORED,
    aps_lifecycle NUMERIC GENERATED ALWAYS AS ((aps->>'lifecycle')::numeric) STORED,
    st_season NUMERIC GENERATED ALWAYS AS ((st->>'season')::numeric / 100.0) STORED,
    st_lifecycle NUMERIC GENERATED ALWAYS AS ((st->>'lifecycle')::numeric / 100.0) STORED,
    st_season_reco NUMERIC GENERATED ALWAYS AS ((st->>'season_reco')::numeric / 100.0) STORED,
    st_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((st->>'lifecycle_reco')::numeric / 100.0) STORED,
    aur_season NUMERIC GENERATED ALWAYS AS ((aur->>'season')::numeric) STORED,
    aur_lifecycle NUMERIC GENERATED ALWAYS AS ((aur->>'lifecycle')::numeric) STORED,
    air_season NUMERIC GENERATED ALWAYS AS ((air->>'season')::numeric) STORED,
    air_lifecycle NUMERIC GENERATED ALWAYS AS ((air->>'lifecycle')::numeric) STORED,
    total_inv_units_bop_qty NUMERIC GENERATED ALWAYS AS ((total_inv_units->>'bop_qty')::numeric) STORED,
    total_inv_units_season NUMERIC GENERATED ALWAYS AS ((total_inv_units->>'season')::numeric) STORED,
    total_inv_units_lifecycle NUMERIC GENERATED ALWAYS AS ((total_inv_units->>'lifecycle')::numeric) STORED,
    avg_wk_cnt_season NUMERIC GENERATED ALWAYS AS ((avg_wk_cnt->>'season')::numeric) STORED,
    avg_wk_cnt_lifecycle NUMERIC GENERATED ALWAYS AS ((avg_wk_cnt->>'lifecycle')::numeric) STORED,
    avg_wk_cnt_season_reco NUMERIC GENERATED ALWAYS AS ((avg_wk_cnt->>'season_reco')::numeric) STORED,
    avg_wk_cnt_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((avg_wk_cnt->>'lifecycle_reco')::numeric) STORED,
    aic_season NUMERIC GENERATED ALWAYS AS ((aic->>'season')::numeric) STORED,
    aic_lifecycle NUMERIC GENERATED ALWAYS AS ((aic->>'lifecycle')::numeric) STORED,
    aic_season_reco NUMERIC GENERATED ALWAYS AS ((aic->>'season_reco')::numeric) STORED,
    aic_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((aic->>'lifecycle_reco')::numeric) STORED,
    receipts_season NUMERIC GENERATED ALWAYS AS ((receipts->>'season')::numeric) STORED,
    receipts_lifecycle NUMERIC GENERATED ALWAYS AS ((receipts->>'lifecycle')::numeric) STORED,
    receipts_season_reco NUMERIC GENERATED ALWAYS AS ((receipts->>'season_reco')::numeric) STORED,
    receipts_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((receipts->>'lifecycle_reco')::numeric) STORED,
    sales_season_reco NUMERIC GENERATED ALWAYS AS ((sales->>'season_reco')::numeric) STORED,
    sales_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((sales->>'lifecycle_reco')::numeric) STORED,
    gross_margin_season_reco NUMERIC GENERATED ALWAYS AS ((gross_margin->>'season_reco')::numeric) STORED,
    gross_margin_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((gross_margin->>'lifecycle_reco')::numeric) STORED,
    aps_season_reco NUMERIC GENERATED ALWAYS AS ((aps->>'season_reco')::numeric) STORED,
    aps_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((aps->>'lifecycle_reco')::numeric) STORED,
    aur_season_reco NUMERIC GENERATED ALWAYS AS ((aur->>'season_reco')::numeric) STORED,
    aur_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((aur->>'lifecycle_reco')::numeric) STORED,
    air_season_reco NUMERIC GENERATED ALWAYS AS ((air->>'season_reco')::numeric) STORED,
    air_lifecycle_reco NUMERIC GENERATED ALWAYS AS ((air->>'lifecycle_reco')::numeric) STORED
) PARTITION BY LIST (plan_code);

CREATE INDEX IF NOT EXISTS idx_lpcl_primary
  ON assort_smart.line_plan_choice_launch (plan_code, final_level, channel, season_code);
CREATE INDEX IF NOT EXISTS idx_lpcl_choice
  ON assort_smart.line_plan_choice_launch (plan_code, placeholder_choice_id);
CREATE INDEX IF NOT EXISTS idx_lpcl_style
  ON assort_smart.line_plan_choice_launch (plan_code, placeholder_style_id, global_style_id);
CREATE INDEX IF NOT EXISTS idx_lpcl_join
  ON assort_smart.line_plan_choice_launch (hierarchy_code, cluster_code);
CREATE INDEX IF NOT EXISTS idx_lpcl_attrs
  ON assort_smart.line_plan_choice_launch USING GIN (attributes jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_lpcl_kpi_season
  ON assort_smart.line_plan_choice_launch (plan_code, sales_units_season, total_inv_units_season);
CREATE INDEX IF NOT EXISTS idx_lpcl_style_tag
  ON assort_smart.line_plan_choice_launch (plan_code, style_tag);


--changeset paras.jaion@impactanalytics.co:assort_smart.line_plan_choice_launch_add_global_orders stripComments:false splitStatements:false context:MTP-75018_new_columns labels:add_global_order_columns
--comment: Add global_choice_id_order and global_style_id_order columns

ALTER TABLE assort_smart.line_plan_choice_launch
ADD COLUMN global_choice_id_order integer DEFAULT 0 NOT NULL,
ADD COLUMN global_style_id_order integer DEFAULT 0 NOT NULL;


--changeset paras.jaion@impactanalytics.co:assort_smart_adding_style_id_s stripComments:false splitStatements:false context:MTP-75018_new_columns labels:add_global_order_columns
--comment: Add global_choice_id_order and global_style_id_order columns

ALTER TABLE assort_smart.line_plan_choice_launch
ADD COLUMN placeholder_style_id_order integer DEFAULT 0 NOT NULL;

--changeset vishal.hosamani@impactanalytics.co:assort_smart.line_plan_choice_launch stripComments:false splitStatements:false context:MTP-75018_new_columns labels:changes_for_line_plan_choice_launch_new_columns
--comment: changes for line_plan_choice_launch partition and new columns
ALTER TABLE assort_smart.line_plan_choice_launch 
ADD COLUMN IF NOT EXISTS is_image_mapped bool DEFAULT false NOT NULL;


--changeset ezhil.kannan@impactanalytics.co:assort_smart.line_plan_choice_idx stripComments:false splitStatements:false context:MTP-75018_new_columns labels:add_global_order_columns
--comment: Add line_plan_choice_launch_temp_plan_final_level_idx
CREATE INDEX IF NOT EXISTS line_plan_choice_launch_temp_plan_final_level_idx
ON assort_smart.line_plan_choice_launch USING btree (plan_code, final_level);

--changeset ezhil.kannan@impactanalytics.co:add_index_lpcl_id_tommy stripComments:false splitStatements:false context:perf_optimization labels:add_index
--comment: Add index on id for apply_constraint stored procedure UPDATE performance
CREATE INDEX IF NOT EXISTS idx_lpcl_id ON assort_smart.line_plan_choice_launch (id);

--changeset ezhil.kannan@impactanalytics.co:add_index_lpcl_merge_join_tommy stripComments:false splitStatements:false context:perf_optimization labels:add_index
--comment: Avoid Merge Join external sort (Disk 452MB). Sort Key (plan_code, final_level, placeholder_choice_id). (plan_code, final_level) already exists.
CREATE INDEX IF NOT EXISTS idx_lpcl_plan_code_final_level_placeholder_choice_id ON assort_smart.line_plan_choice_launch (plan_code, final_level, placeholder_choice_id);
