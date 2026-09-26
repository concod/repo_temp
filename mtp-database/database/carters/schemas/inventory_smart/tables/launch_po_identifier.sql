-- liquibase formatted sql
-- changeset shameel.zeshan@impactanalytics.co:launch_po_identifier_1 stripComments:false splitStatements:false context: db_sync labels:launch_po_identifier
-- comment: initial changeset for launch_po_identifier

CREATE TABLE inventory_smart.launch_po_identifier (
	country varchar NOT NULL,
	omnia_bulk_po_number varchar NOT NULL,
	id int4 NOT NULL
);

-- changeset shrinidhi.choragi@impactanalytics.co:launch_po_identifier_1 stripComments:false splitStatements:false context: db_sync labels: added unique index for launch_po_identifier
-- comment: added unique index for launch_po_identifier
ALTER TABLE inventory_smart.launch_po_identifier ADD CONSTRAINT launch_po_identifier_un UNIQUE (country, omnia_bulk_po_number);
