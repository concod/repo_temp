--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:buystatus_master stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for buystatus_master

CREATE TABLE if not EXISTS item_smart.buystatus_master (
	dept text NOT NULL,
	channel text NOT NULL,
    season text NOT NULL,
    hierarchy_code int8 NOT NULL,
	total_receipt_units float8 NULL,
    status_value text NOT NULL DEFAULT 'Initial'
);

--changeset shrey.jaiswal@impactanalytics.co:buystatus_master_constraint stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for adding constraint
ALTER TABLE item_smart.buystatus_master ADD CONSTRAINT buy_master_pk PRIMARY KEY (dept, channel, season, hierarchy_code);

--changeset shrey.jaiswal@impactanalytics.co:buystatus_master_indexes stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: adding indexes

CREATE INDEX idx_buystatus_master_dept ON item_smart.buystatus_master USING btree (dept);
CREATE INDEX idx_buystatus_master_channel ON item_smart.buystatus_master USING btree (channel);
CREATE INDEX idx_buystatus_master_season ON item_smart.buystatus_master USING btree (season);
CREATE INDEX idx_buystatus_master_hcode ON item_smart.buystatus_master USING btree (hierarchy_code); 

--changeset abimanyu.j@impactanalytics.co:buystatus_master_add_status_last_week_fix stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: adding status_last_week column to buystatus_master

ALTER TABLE item_smart.buystatus_master 
ADD COLUMN IF NOT EXISTS status_last_week text NOT NULL DEFAULT 'Initial';
