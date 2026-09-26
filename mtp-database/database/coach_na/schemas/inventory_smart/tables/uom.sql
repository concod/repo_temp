--liquibase formatted sql
--changeset draksharapu.rajesh:uom stripComments:false splitStatements:false context:Release_1.1 labels:uom
--comment: initial changeset for uom
CREATE TABLE   inventory_smart.uom (
	from_unit_description varchar NULL,
	factor float4 NULL,
	to_unit_description varchar NULL,
	item_id varchar NOT NULL,
	from_unit varchar NULL,
	to_unit varchar NULL,
	"date" date NULL,
	CONSTRAINT uom_pk PRIMARY KEY (item_id)
);

--changeset aiyush.prasad@impactanalytics.co:uom_article_column_add stripComments:false splitStatements:false context:Release_1_0 labels:MTP-77903
--comment: added article
ALTER TABLE inventory_smart.uom ADD COLUMN   article varchar NULL;

--changeset manas.malik@impactanalytics.co:uom_store_column_add stripComments:false splitStatements:false context:Release_1_0 labels:store_code_added
--comment: added store_code
ALTER TABLE inventory_smart.uom ADD COLUMN  store_code varchar NULL;

--changeset manas.malik@impactanalytics.co:uom_composite_pk stripComments:false splitStatements:false context:Release_1_0 labels:composite_primary_key
--comment: change primary key to composite key (item_id, store_code)
ALTER TABLE inventory_smart.uom ALTER COLUMN store_code SET NOT NULL;
ALTER TABLE inventory_smart.uom DROP CONSTRAINT uom_pk;
ALTER TABLE inventory_smart.uom ADD CONSTRAINT uom_pk PRIMARY KEY (item_id, store_code);