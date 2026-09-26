--liquibase formatted sql
--changeset liquibase:uom stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for uom
CREATE TABLE IF NOT EXISTS inventory_smart.uom (
	from_unit_description varchar NULL,
	factor float4 NULL,
	to_unit_description varchar NULL,
	item_id varchar NOT NULL,
	from_unit varchar NULL,
	to_unit varchar NULL,
	"date" date NULL,
	CONSTRAINT uom_pk PRIMARY KEY (item_id)
);


--changeset samridhi.gupta@impactanalytics.co:uom_article_column_add stripComments:false splitStatements:false context:Release_1_0 labels:MTP-77903
--comment: added article
ALTER TABLE inventory_smart.uom ADD COLUMN IF NOT EXISTS article varchar NULL;

--changeset samridhi.gupta@impactanalytics.co:carton_factor_added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-77903
--comment: added article
ALTER TABLE inventory_smart.uom ADD COLUMN IF NOT EXISTS carton_factor float4 NULL;