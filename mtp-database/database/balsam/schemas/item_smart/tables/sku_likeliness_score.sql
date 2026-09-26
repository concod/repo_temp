
--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sku_likeliness_score_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for sku_likeliness_score
CREATE TABLE item_smart.sku_likeliness_score (
	new_sku_id text NOT NULL,
	sku_id text NOT NULL,
	likeliness_score float8 NOT NULL
);

ALTER TABLE item_smart.sku_likeliness_score
ADD CONSTRAINT pk_sku_likeliness PRIMARY KEY (new_sku_id, sku_id);