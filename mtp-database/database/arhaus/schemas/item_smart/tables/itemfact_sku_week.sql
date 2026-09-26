--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:ItemFact stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for itemfact_sku_week table

CREATE TABLE item_smart.itemfact_sku_week (
    dept text NOT NULL,
    hierarchy_code int8 NULL,
    current_week int8 NOT NULL,
    purchase_status text NULL,
    air float8 NULL,
    tier_store_count jsonb NULL
)
PARTITION BY LIST (dept);


--changeset abhimanyu.j@impactanalytics.co:ItemFactAlter_7 stripComments:false splitStatements:false context:Release_1_1 labels:itemfact_update
--comment: Adding new columns and setting default values
ALTER TABLE item_smart.itemfact_sku_week
ADD COLUMN air_feed float8 NULL,
ADD COLUMN tier_store_count_feed jsonb NULL,
ADD COLUMN air_is_source_feed bool DEFAULT true NULL,
ADD COLUMN tier_store_count_is_source_feed bool DEFAULT true NULL;

--changeset abhimanyu.j@impactanalytics.co:Item_sku_week_constraint stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_update
--comment: Altering table to add constraint
ALTER TABLE item_smart.itemfact_sku_week
ADD CONSTRAINT unique_itemfact_sku_week UNIQUE (hierarchy_code, dept, current_week);