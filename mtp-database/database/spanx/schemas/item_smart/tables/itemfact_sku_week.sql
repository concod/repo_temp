--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:ItemFact stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for itemfact_sku_week table

CREATE TABLE item_smart.itemfact_sku_week (
		dept text NOT NULL,
		hierarchy_code int8 NULL,
		current_week bigint NOT NULL,
		purchase_status text NULL,
		fwos int8 NULL,
		fwos_feed int8 NULL,
		fwos_is_source_feed bool DEFAULT true NULL,
		lead_time int8 NULL,
		lead_time_feed int8 NULL,
		lead_time_is_source_feed bool DEFAULT true NULL,
		damage_rate int8 NULL,
		damage_rate_feed int8 NULL,
		damage_rate_is_source_feed bool DEFAULT true NULL,
		moq float8 NULL,
		moq_feed float8 NULL,
		moq_is_source_feed bool DEFAULT true NULL,
	CONSTRAINT unique_itemfact_sku_week UNIQUE (hierarchy_code, dept, current_week)
)
PARTITION BY LIST (dept);

--changeset hithesh.s@impactanalytics.co:Item_sku_week_col_add stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_update
--comment: Altering table to add constraint
ALTER TABLE item_smart.itemfact_sku_week
ADD COLUMN reco_rcpt_week_flag BOOLEAN NOT NULL DEFAULT FALSE;