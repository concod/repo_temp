-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:lms_attributes stripComments:false splitStatements:false context: db_sync labels:lms_attributes
-- comment: initial changeset for lms_attributes
CREATE TABLE   inventory_smart.lms_attributes (
	l1_name varchar NULL,
	l2_name varchar NULL,
	article varchar NULL,
	store_code varchar NULL,
	lms_attributes text NULL,
	lms_attribute_value text NULL
);

-- changeset hemantkumar.bajaj@impactanalytics.co:lms_attributes_v2 stripComments:false splitStatements:false context: db_sync labels:lms_attributes
-- comment: initial changeset for lms_attributes_v2

CREATE INDEX idx_lms_attributes_l1_l2_article
    ON inventory_smart.lms_attributes (l1_name, l2_name, article);

-- changeset hemantkumar.bajaj@impactanalytics.co:lms_attributes_1 stripComments:false splitStatements:false context: db_sync labels:lms_attributes
-- comment: initial changeset for lms_attributes_1

ALTER TABLE inventory_smart.lms_attributes
  ALTER COLUMN l1_name SET NOT NULL,
  ALTER COLUMN l2_name SET NOT NULL,
  ALTER COLUMN article SET NOT NULL,
  ALTER COLUMN store_code SET NOT NULL,
  ADD CONSTRAINT lms_attribute_pk PRIMARY KEY (l1_name, l2_name, article, store_code);