-- liquibase formatted sql
-- changeset sri.harsha@impactanalytics.co:article_inventory_constraint stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
-- comment: initial changeset for article_inventory_constraint
CREATE TABLE inventory_smart.article_inventory_constraint (
	article varchar(50) NULL,
	display_article varchar(50) NULL,
    dc_code int4 NULL,
	l0_name varchar(50) NULL,
	vir_reservation_total int4 NULL,
	vir_reservation_remaining int4 NULL,
	iob_reservation_remaining int4 NULL,
	vir_constraint_flag varchar(50) NULL
);

-- changeset himansh.bhardwaj@impactanalytics.co:article_inventory_constraint stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
-- comment: added transit_time and wholesale_unit_price columns
ALTER TABLE inventory_smart.article_inventory_constraint
ADD COLUMN IF NOT EXISTS transit_time JSONB,
ADD COLUMN IF NOT EXISTS wholesale_unit_price FLOAT4;

-- changeset himansh.bhardwaj@impactanalytics.co:adding UQ IDX stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
-- comment: adding unique index to adjust for modified SP
CREATE UNIQUE INDEX idx_article_inventory_constraint_upsert_key
ON inventory_smart.article_inventory_constraint (l0_name, display_article, article, dc_code);

-- changeset himansh.bhardwaj@impactanalytics.co:aic_rem_wup_to_dm stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
-- comment: aic_rem_wup_to_dm
ALTER TABLE inventory_smart.article_inventory_constraint
RENAME COLUMN wholesale_unit_price TO delivered_mtd;
ALTER TABLE inventory_smart.article_inventory_constraint
ALTER COLUMN delivered_mtd TYPE INT4;

-- changeset himansh.bhardwaj@impactanalytics.co:set_not_null_for_pk stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
-- comment: primary key columns must be NOT NULL before constraint creation
ALTER TABLE inventory_smart.article_inventory_constraint 
ALTER COLUMN l0_name SET NOT NULL,
ALTER COLUMN display_article SET NOT NULL,
ALTER COLUMN article SET NOT NULL,
ALTER COLUMN dc_code SET NOT NULL;

-- changeset himansh.bhardwaj@impactanalytics.co:replace_uq_idx_with_pk stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
-- comment: dropping unique index and adding primary key at the same level
-- DROP INDEX IF EXISTS inventory_smart.idx_article_inventory_constraint_upsert_key;

ALTER TABLE inventory_smart.article_inventory_constraint 
ADD CONSTRAINT pk_article_inventory_constraint 
PRIMARY KEY (l0_name, display_article, article, dc_code);

-- rollback ALTER TABLE inventory_smart.article_inventory_constraint DROP CONSTRAINT pk_article_inventory_constraint;
-- rollback CREATE UNIQUE INDEX idx_article_inventory_constraint_upsert_key ON inventory_smart.article_inventory_constraint (l0_name, display_article, article, dc_code);