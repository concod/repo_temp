--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:tb_end_cap_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_end_cap_details

DROP TABLE IF EXISTS price_promo_opt.tb_end_cap_details;

CREATE TABLE price_promo_opt.tb_end_cap_details (
	"Product ID" int8 NOT NULL,
	"Promo ID" int4 NOT NULL,
	"Promo Name" text NOT NULL,
	"Status" text NOT NULL,
	"Start Date" date NOT NULL,
	"End Date" date NOT NULL,
	"Endcap flag" int2 DEFAULT 0 NOT NULL,
	"Last Backsync At" timestamptz NOT NULL
);