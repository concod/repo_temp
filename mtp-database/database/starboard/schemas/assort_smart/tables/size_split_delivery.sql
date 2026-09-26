--liquibase formatted sql
--changeset vishal.hosamani@impactanalytics.co:size_delivery_split_table liquibase:size_delivery_split stripComments:false splitStatements:false context:size_delivery_split labels:liquibase_project_start
--comment: created table for size_delivery_split

CREATE TABLE assort_smart.size_delivery_split (
    size_delivery_id SERIAL4 NOT NULL,
    plan_code INT4 NOT NULL,
    choice_id VARCHAR NOT NULL,
    style_id VARCHAR NULL,
    color_id VARCHAR NULL,
    delivery VARCHAR NOT NULL,
    delivery_perc FLOAT8 NOT NULL,
    delivery_date TIMESTAMP NOT NULL,
    size_name VARCHAR NOT NULL,
    buy_units FLOAT8 NULL,
    CONSTRAINT size_delivery_split_pkey PRIMARY KEY (size_delivery_id)
);


--changeset pramodgowda.kl@impactanalytics.co:added_style_and_color_name_columns_to_size_delivery_split liquibase:size_delivery_split stripComments:false splitStatements:false context:size_delivery_split_new columns labels:added_2_columns
--comment: added style and color name columns to size_delivery_split table
ALTER TABLE assort_smart.size_delivery_split ADD COLUMN order_placed BOOLEAN DEFAULT FALSE;
ALTER TABLE assort_smart.size_delivery_split ADD COLUMN style_name VARCHAR NULL;
ALTER TABLE assort_smart.size_delivery_split ADD COLUMN color_name VARCHAR NULL;


--changeset vishal.hosamani@impactanalytics.co:create_index_on_size_delivery_split_plan_choice_size liquibase:size_delivery_split stripComments:false splitStatements:false context:size_delivery_split_new columns labels:added_2_columns
--comment: create index on size_delivery_split table
CREATE INDEX IF NOT EXISTS idx_sds_plan_choice_size
ON assort_smart.size_delivery_split (plan_code, choice_id, size_name);

CREATE INDEX IF NOT EXISTS idx_sds_plan_choice_delivery_size
ON assort_smart.size_delivery_split (plan_code, choice_id, delivery, size_name);
