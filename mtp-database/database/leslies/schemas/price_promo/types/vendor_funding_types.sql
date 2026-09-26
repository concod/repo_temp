--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:added_vendor_funding_types  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added vendor funding types and update vf_type column from int to enum in ps_rules table
CREATE TYPE price_promo."vendor_funding_types" AS ENUM (
	'Fixed amount',
	'Per unit $',
	'Ads.amount & Per unit $'
);

