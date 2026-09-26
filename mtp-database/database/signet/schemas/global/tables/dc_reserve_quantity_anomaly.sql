--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:dc_reserve_quantity_anomaly_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity_anomaly
CREATE TABLE IF NOT EXISTS "global".dc_reserve_quantity_anomaly (
	product_code varchar NULL,
	quantity int4 NULL,
	created_at timestamptz NULL,
	"type" varchar NULL,
	dc_code int4 NULL,
	reservation_till_date date NULL,
	instock_inclusion bool NULL,
	updated_by varchar NULL,
	"comment" varchar NULL,
	deleted_date date NULL
);

--changeset rishitha.gangadhara@impactanalytics.co:dc_reserve_quantity_anomaly_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity_anomaly_2
ALTER TABLE "global".dc_reserve_quantity_anomaly DROP CONSTRAINT IF EXISTS dc_reserve_quantity_anomaly_pk;
ALTER TABLE "global".dc_reserve_quantity_anomaly ADD CONSTRAINT dc_reserve_quantity_anomaly_pk PRIMARY KEY (product_code, dc_code, reservation_till_date);