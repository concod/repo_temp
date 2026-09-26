
--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sku_subchannel_eligibility _1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for sku_subchannel_eligibility 
CREATE TABLE item_smart.sku_subchannel_eligibility (
	sku text NOT NULL,
	l0_name text NOT NULL,
	channel text NOT NULL,
	sub_channel text NOT NULL,
	eligibility_start_date date NOT NULL,
	eligibility_end_date date DEFAULT '3099-01-01'::date NOT NULL,
	CONSTRAINT sku_subchannel_eligibility_pkey PRIMARY KEY (sku, l0_name, channel, sub_channel)
);