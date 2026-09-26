--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:itemfact_sku_week0 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku_week

CREATE TABLE IF NOT EXISTS item_smart.itemfact_sku_week (
		hierarchy_code numeric NULL,
        dept text NULL,
        current_week int8 null ,
        target_fwos float8 NULL,
        target_fwos_feed float8 NULL,
        target_fwos_is_source_feed bool DEFAULT true null,
	CONSTRAINT unique_itemfact_sku_week UNIQUE (dept, hierarchy_code, current_week)
)
PARTITION BY LIST (dept);

--changeset shrey.jaiswal@impactanalytics.co:itemfact_sku_week_1 stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for itemfact_sku_week

ALTER TABLE item_smart.itemfact_sku_week ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;


--changeset kalyan.chandu@impactanalytics.co:itemfact_sku_week_indexes01 stripComments:false splitStatements:false context:Release_index labels:indexes-fix
--comment: added indexes
CREATE INDEX IF NOT EXISTS idx_itemfact_sku_week_curr_wk ON item_smart.itemfact_sku_week USING btree (current_week);
CREATE INDEX IF NOT EXISTS idx_itemfact_sku_week_dept ON item_smart.itemfact_sku_week USING btree (dept);
CREATE INDEX IF NOT EXISTS idx_itemfact_sku_week_hcode ON item_smart.itemfact_sku_week USING btree (hierarchy_code);