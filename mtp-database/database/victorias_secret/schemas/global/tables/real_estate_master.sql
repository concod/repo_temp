--liquibase formatted sql
--changeset liquibase:real_estate_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for real_estate_master
CREATE TABLE "global".real_estate_master (
	legacy_store_code varchar NOT NULL,
    legacy_store_closing_date date NULL,
    temp_store_code varchar NULL,
    temp_store_effective_date date NULL,
    temp_store_opening_date date NULL,
    temp_store_closing_date date NULL,
    remodel_store_code varchar NULL,
    remodel_store_effective_date date NULL,
    remodel_reservation_start_date date NULL,
    remodel_store_opening_date date NULL  
    );


--changeset liquibase:real_estate_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset2 for real_estate_master

ALTER TABLE "global".real_estate_master ADD COLUMN flagged_rows INTEGER NULL;


--changeset kamuju.mahaveer@impactanalytics.co:real_estate_master_2 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: schema update for real_estate_master
ALTER TABLE "global".real_estate_master ADD CONSTRAINT real_estate_master_pk PRIMARY KEY (legacy_store_code);

