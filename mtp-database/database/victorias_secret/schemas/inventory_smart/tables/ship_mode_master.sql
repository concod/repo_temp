--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:ship_mode_master stripComments:false splitStatements:false context:VS_inv_smart labels:VS-174
--comment: initial changeset for ship_mode_master
CREATE TABLE inventory_smart.ship_mode_master (
	l0_id varchar NULL,
	vendor_name varchar NULL,
	lead_time int4 NULL,
	moq int4 NULL,
	l3_name varchar NULL,
	ship_mode varchar NULL
);


--changeset kamuju.mahaveer@impactanalytics.co:ship_mode_master_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-319
--comment: Updated Schema based on Alignment with product and DB team
ALTER TABLE inventory_smart.ship_mode_master RENAME COLUMN l3_name TO l2_name ;

