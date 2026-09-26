--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:itemfact_sku1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku

CREATE TABLE IF NOT EXISTS item_smart.itemfact_sku (
		hierarchy_code numeric NULL,
        dept text NULL,
        moq float8 NULL,
        moq_feed float8 NULL,
        moq_is_source_feed bool DEFAULT true NULL,
        lead_time float8 NULL,
        lead_time_feed float8 NULL,
        lead_time_is_source_feed bool DEFAULT true NULL,
        launch_date date NULL,
        clearance_date date NULL,
        exit_date date NULL,
	CONSTRAINT unique_itemfact_sku UNIQUE (dept, hierarchy_code)
)
PARTITION BY LIST (dept); 

--changeset shrey.jaiswal@impactanalytics.co:itemfact_sku_1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku_week

ALTER TABLE item_smart.itemfact_sku ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;

--changeset shrey.jaiswal@impactanalytics.co:itemfact_sku_2 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku

ALTER TABLE item_smart.itemfact_sku ALTER COLUMN dept SET NOT NULL;

ALTER TABLE item_smart.itemfact_sku ADD COLUMN launch_date_feed date NULL;
ALTER TABLE item_smart.itemfact_sku ADD COLUMN launch_date_is_source_feed date NULL;
ALTER TABLE item_smart.itemfact_sku ADD COLUMN clearance_date_feed date NULL;
ALTER TABLE item_smart.itemfact_sku ADD COLUMN clearance_date_is_source_feed date NULL;
ALTER TABLE item_smart.itemfact_sku ADD COLUMN exit_date_feed date NULL;
ALTER TABLE item_smart.itemfact_sku ADD COLUMN exit_date_is_source_feed date NULL;

--changeset shrey.jaiswal@impactanalytics.co:itemfact_sku_5 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku

ALTER TABLE item_smart.itemfact_sku ALTER COLUMN launch_date_is_source_feed TYPE BOOLEAN USING NULL; 
ALTER TABLE item_smart.itemfact_sku ALTER COLUMN launch_date_is_source_feed SET DEFAULT TRUE;

--changeset shrey.jaiswal@impactanalytics.co:itemfact_sku_6 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku

ALTER TABLE item_smart.itemfact_sku ALTER COLUMN clearance_date_is_source_feed TYPE BOOLEAN USING NULL; 
ALTER TABLE item_smart.itemfact_sku ALTER COLUMN clearance_date_is_source_feed SET DEFAULT TRUE;

ALTER TABLE item_smart.itemfact_sku ALTER COLUMN exit_date_is_source_feed TYPE BOOLEAN USING NULL; 
ALTER TABLE item_smart.itemfact_sku ALTER COLUMN exit_date_is_source_feed SET DEFAULT TRUE;