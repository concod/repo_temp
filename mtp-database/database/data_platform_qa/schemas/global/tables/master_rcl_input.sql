---liquibase formatted sql
--changeset kamaleshwaran.k@impactanalytics.co:master_rcl_input stripComments:false splitStatements:false context:Release_2 labels:initial changeset for master_rcl_input
--comment: initial changeset for master_rcl_input 


CREATE TABLE if not exists "global".master_rcl_input (
    id serial4 primary key,
    product_code varchar NULL,
	psa_code varchar NULL,
	store_code varchar NULL,
	clus int8 NULL
);