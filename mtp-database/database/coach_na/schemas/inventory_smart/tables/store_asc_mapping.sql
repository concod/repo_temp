-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:store_asc_mapping stripComments:false splitStatements:false context:MTP-83463 labels:MTP-83463 
-- comment: initial changeset for store_asc_mapping 

CREATE TABLE inventory_smart.store_asc_mapping (
    store_code varchar(50) NOT NULL,
    sap_site_id varchar(20) NULL,
    asc_id varchar(20) NOT NULL,
    PRIMARY KEY (store_code, asc_id)
);