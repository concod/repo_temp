--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:alerts_1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku_week

CREATE TABLE IF NOT EXISTS item_smart.itemfact_sku_week (
		hierarchy_code numeric NULL,
        country text NULL,
        current_week INT4 null ,
        target_fwos float4 NULL,
        target_fwos_feed float4 NULL,
        target_fwos_is_source_feed bool DEFAULT true null,
	CONSTRAINT unique_itemfact_sku_week UNIQUE (hierarchy_code, country, current_week)
)
PARTITION BY LIST (country);

--changeset sonika.baheti@impactanalytics.co:itemfact_sku_week stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  rename columns

ALTER TABLE item_smart.itemfact_sku_week RENAME COLUMN country TO dept;

--changeset shreyansh.pathak@impactanalytics.co:itemfact_sku_week_v2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for hierarchy code column

ALTER TABLE item_smart.itemfact_sku_week ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;

--changeset shreyansh.pathak@impactanalytics.co:itemfact_sku_week_v3 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.itemfact_sku_week ALTER COLUMN target_fwos TYPE float8 USING target_fwos::float8;
ALTER TABLE item_smart.itemfact_sku_week ALTER COLUMN target_fwos_feed TYPE float8 USING target_fwos_feed::float8;



--changeset madhumitha.s@impactanalytics.co:itemfact_sku_week_reco_rcpt_week_flag_new_1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: adding column_reco_rcpt_week_flag

ALTER TABLE item_smart.itemfact_sku_week Add COLUMN IF NOT EXISTS reco_rcpt_week_flag bool NOT NULL;
