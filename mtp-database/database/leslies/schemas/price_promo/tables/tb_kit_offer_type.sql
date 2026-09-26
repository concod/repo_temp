--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_kit_offer_type stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_kit_offer_type

CREATE TABLE price_promo.tb_kit_offer_type (
    kit_offer_type_id serial4 NOT NULL,
	identifier varchar(100) NOT NULL,
	display_name varchar(100) NULL,
	is_active int2 DEFAULT 1 NULL,
	CONSTRAINT tb_kit_offer_type_pkey PRIMARY KEY (kit_offer_type_id)
);