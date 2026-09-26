--liquibase formatted sql
--changeset manohara.gulla@impactanalytics.co liquibase:new_store_metrics stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_metrics
CREATE TABLE inventory_smart.new_store_metrics (
	store_code varchar NULL,
	product_code varchar NULL,
	need int4 NULL,
	next_po_upcoming_date date NULL,
	po_upcoming_units int4 NULL
);



--changeset kamuju.mahaveer@impactanalytics.co:new_store_metrics_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-493
--comment: Adding unique key constraint
ALTER TABLE inventory_smart.new_store_metrics ADD constraint  new_store_metrics_unique UNIQUE (product_code,store_code);

--changeset anujkumar.singh@impactanalytics.co:new_store_metrics_v2 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding remodel store related columns
ALTER TABLE inventory_smart.new_store_metrics ADD COLUMN IF NOT EXISTS remodel_flag BOOLEAN;