--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.size_split_master_fixes stripComments:false splitStatements:false context:MTP-75019 labels:create_table
--comment: create table size_split_master with index

CREATE TABLE IF NOT EXISTS assort_smart.size_split_master (
    size_split_master_id bigserial NOT NULL,
    plan_code int4 NOT NULL,
    season varchar NULL,
    season_code int4 NULL,
    channel int4 NULL,
    sub_channel int4 NULL,
    hierarchy_code varchar NULL,
    final_level varchar NOT NULL,
    style_id varchar NULL,
    choice_id varchar NULL,
    color_id varchar NULL,
    size_id varchar NULL,
    size_name varchar NULL,
    store varchar NULL,
    "cluster" varchar NULL,
    sales_units float8 NULL,
    buy_units float8 NULL,
    curve_per float8 NULL,
    aur float8 NULL,
    air float8 NULL,
    auc float8 NULL,
    order_placed varchar NULL,
    style_tag varchar NULL,
    buy_units_line_data float8 NULL,
    style_name varchar NULL,
    color_name varchar NULL,
    CONSTRAINT size_split_master_og_pkey PRIMARY KEY (size_split_master_id, final_level, plan_code)
)
PARTITION BY LIST (final_level);

CREATE INDEX IF NOT EXISTS idx_size_split_master_search 
    ON assort_smart.size_split_master USING btree (plan_code, final_level);

--changeset pramodgowda.kl@impactanalytics.co:order_column stripComments:false splitStatements:false context:MTP-110641 labels: add_column
--comment: choice_order_column
ALTER TABLE assort_smart.size_split_master
ADD COLUMN IF NOT EXISTS placeholder_choice_id_order INTEGER DEFAULT 0;

--changeset srinivasgowda.sg@impactanalytics.co:order_column stripComments:false splitStatements:false context:MTP-110642 labels: add_index
--comment: indexing
  CREATE INDEX if not exists  idx_ssm_plan_final_choice_cluster_store ON assort_smart.size_split_master (plan_code, final_level, choice_id, cluster, store);
