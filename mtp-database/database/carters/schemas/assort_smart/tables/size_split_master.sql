--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:assort_smart.size_split_master stripComments:false splitStatements:false context:MTP-75019 labels:create_table
--comment: initial changeset for size_split_master

CREATE table if not exists assort_smart.size_split_master (
    size_split_master_id SERIAL8 PRIMARY KEY,
    plan_code INTEGER,
    season VARCHAR,
    season_code INTEGER,
    channel INTEGER,
    sub_channel INTEGER,
    hierarchy_code VARCHAR,
    final_level VARCHAR,
    style_id VARCHAR,
    choice_id VARCHAR,
    color_id VARCHAR,
    size_id VARCHAR,
    size_name VARCHAR,
    store VARCHAR,
    cluster VARCHAR,
    sales_units FLOAT,
    buy_units FLOAT,
    curve_per FLOAT,
    aur FLOAT,
    air FLOAT,
    auc FLOAT
);

CREATE INDEX if not exists idx_size_split_search 
ON assort_smart.size_split_master(plan_code, final_level);


--changeset pramodgowda.kl@impactanalytics.co:order_column stripComments:false splitStatements:false context:MTP-110641 labels: add_column
--comment: choice_order_column
ALTER TABLE assort_smart.size_split_master
ADD COLUMN IF NOT EXISTS placeholder_choice_id_order INTEGER DEFAULT 0;

--changeset srinivasgowda.sg@impactanalytics.co:order_column stripComments:false splitStatements:false context:MTP-110642 labels: add_index
--comment: indexing
  CREATE INDEX if not exists  idx_ssm_plan_final_choice_cluster_store ON assort_smart.size_split_master (plan_code, final_level, choice_id, cluster, store);
