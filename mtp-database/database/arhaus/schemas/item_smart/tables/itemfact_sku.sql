--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:ItemFact stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for itemfact_sku table

CREATE TABLE item_smart.itemfact_sku (
    dept text NULL,
    hierarchy_code int8 NULL,
    launch_date date NULL,
    markdown_date date NULL,
    vendor_name text NULL,
    exit_date date NULL,
    no_of_reg_weeks int8 NULL,
    lead_time int8 NULL,
    baseline_discount float8 NULL,
    moq int4 NULL,
    presentation_min int4 NULL,
    fwos_target int4 NULL,
    auc float4 NULL,
    aoh_flag bool NULL
)
PARTITION BY LIST (dept);


--changeset abhimanyu.j@impactanalytics.co:ItemFactAlter_7 stripComments:false splitStatements:false context:Release_1_1 labels:itemfact_update
--comment: Adding new columns and setting default values
ALTER TABLE item_smart.itemfact_sku
ADD COLUMN launch_date_feed date NULL,
ADD COLUMN markdown_date_feed date NULL,
ADD COLUMN vendor_name_feed text NULL,
ADD COLUMN exit_date_feed date NULL,
ADD COLUMN no_of_reg_weeks_feed int8 NULL,
ADD COLUMN lead_time_feed int8 NULL,
ADD COLUMN moq_feed int4 NULL,
ADD COLUMN presentation_min_feed int4 NULL,
ADD COLUMN auc_feed float4 NULL,
ADD COLUMN fwos_target_feed int4 NULL,
ADD COLUMN baseline_discount_feed float8 NULL,
ADD COLUMN aoh_flag_feed bool NULL,
ADD COLUMN launch_date_is_source_feed bool DEFAULT true NULL,
ADD COLUMN markdown_date_is_source_feed bool DEFAULT true NULL,
ADD COLUMN vendor_name_is_source_feed bool DEFAULT true NULL,
ADD COLUMN exit_date_is_source_feed bool DEFAULT true NULL,
ADD COLUMN no_of_reg_weeks_is_source_feed bool DEFAULT true NULL,
ADD COLUMN lead_time_is_source_feed bool DEFAULT true NULL,
ADD COLUMN moq_is_source_feed bool DEFAULT true NULL,
ADD COLUMN presentation_min_is_source_feed bool DEFAULT true NULL,
ADD COLUMN auc_is_source_feed bool DEFAULT true NULL,
ADD COLUMN fwos_target_is_source_feed bool DEFAULT true NULL,
ADD COLUMN baseline_discount_is_source_feed bool DEFAULT true NULL,
ADD COLUMN aoh_flag_is_source_feed bool DEFAULT true NULL;

--changeset abhimanyu.j@impactanalytics.co:Item_sku_constraint stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_update
--comment: Altering table to add constraint at dept and hierarchy_code lvl
ALTER TABLE item_smart.itemfact_sku
ADD CONSTRAINT unique_itemfact_sku UNIQUE (dept, hierarchy_code);