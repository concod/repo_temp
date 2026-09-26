-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:store_level_buy_qty_modification_changes_03 stripComments:false splitStatements:false context:store_level_buy_qty_modification_changes_03 labels:store_level_buy_qty_modification_changes_03
-- comment: update changeset for store_level_buy_qty_modification_changes_03

CREATE TABLE IF NOT EXISTS size_smart.store_level_buy_qty (
	l0_name text NULL,
	display_article text NULL,
	store_code text NULL,
	season text NULL,
	"year" int4 NULL,
	buy_qty int4 NULL,
	floorset_date date NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	id serial4 NOT NULL,
	CONSTRAINT uq_store_level_buy_qty_unique UNIQUE (l0_name, display_article, store_code, season, year)
);