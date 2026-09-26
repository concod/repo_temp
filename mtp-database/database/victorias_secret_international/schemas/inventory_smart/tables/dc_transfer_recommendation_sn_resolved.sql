--liquibase formatted sql
--changeset tarun.tyagi@impactanalytics.co:dc_transfer_recommendation_sn_resolved stripComments:false splitStatements:false context:VS_intl_inv_smart labels:MTP-80390
--comment: initial changeset for dc_transfer_recommendation_sn_resolved


CREATE TABLE IF NOT EXISTS inventory_smart.dc_transfer_recommendation_sn_resolved (
	article varchar NOT NULL,
    launch_date date NULL,
    launch_floorset varchar NULL,
    floorset_start_date date NULL,
    floorset_end_date date NULL,
    ship_date date NULL,
    promised_reco_days int4 NULL,
    alert_start_date date NULL,
    alert_end_date date NULL,
    source_code varchar NOT NULL,
    source_type varchar NULL,
    destination_code varchar NOT NULL,
    destination_type varchar NULL,
    supply_route_name varchar NULL,
    tag varchar NULL,
    PRIMARY KEY (article, source_code, destination_code)
);