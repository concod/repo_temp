--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:alerts_1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku

CREATE TABLE IF NOT EXISTS item_smart.itemfact_sku (
		hierarchy_code numeric NULL,
        country text NULL,
        moq float4 NULL,
        moq_feed float4 NULL,
        moq_is_source_feed bool DEFAULT true NULL,
        vendor_dc_lead_time float4 NULL,
        vendor_dc_lead_time_feed float4 NULL,
        vendor_dc_lead_time_is_source_feed bool DEFAULT true NULL,
	CONSTRAINT unique_itemfact_sku UNIQUE (hierarchy_code,country)
)
PARTITION BY LIST (country); 

--changeset sonika.baheti@impactanalytics.co:itemfact_sku stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  rename columns

ALTER TABLE item_smart.itemfact_sku RENAME COLUMN country TO dept;

--changeset shreyansh.pathak@impactanalytics.co:itemfact_sku_v2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for hierarchy code column

ALTER TABLE item_smart.itemfact_sku ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;

--changeset shreyansh.pathak@impactanalytics.co:itemfact_sku_v3 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.itemfact_sku ALTER COLUMN moq TYPE float8 USING moq::float8;
ALTER TABLE item_smart.itemfact_sku ALTER COLUMN moq_feed TYPE float8 USING moq_feed::float8;
ALTER TABLE item_smart.itemfact_sku ALTER COLUMN vendor_dc_lead_time TYPE float8 USING vendor_dc_lead_time::float8;
ALTER TABLE item_smart.itemfact_sku ALTER COLUMN vendor_dc_lead_time_feed TYPE float8 USING vendor_dc_lead_time_feed::float8;

--changeset sonika.baheti@impactanalytics.co:itemfact_sku_v4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Adding new columns
ALTER TABLE item_smart.itemfact_sku ADD launch_date date NULL;
ALTER TABLE item_smart.itemfact_sku ADD launch_date_feed date NULL;
ALTER TABLE item_smart.itemfact_sku ADD launch_date_is_source_feed bool DEFAULT true NULL;
ALTER TABLE item_smart.itemfact_sku ADD clearance_date date NULL;
ALTER TABLE item_smart.itemfact_sku ADD clearance_date_feed date NULL;
ALTER TABLE item_smart.itemfact_sku ADD clearance_date_is_source_feed bool DEFAULT true NULL;
ALTER TABLE item_smart.itemfact_sku ADD exit_date date NULL;
ALTER TABLE item_smart.itemfact_sku ADD exit_date_feed date NULL;
ALTER TABLE item_smart.itemfact_sku ADD exit_date_is_source_feed bool DEFAULT true NULL;