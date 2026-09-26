--liquibase formatted sql
--changeset hari.krishnal@impactanalytics.co:receipt_cycle stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for receipt_cycle
CREATE TABLE item_smart.receipt_cycle (
    brand TEXT,
    dept TEXT,
    subdept TEXT,
    num_receipts_weeks INTEGER,
    receipt_week INTEGER,
    proportion FLOAT
);


--changeset jaya.khandelwal@impactanalytics.co:receipt_cycle_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: rename col for receipt_cycle
ALTER TABLE item_smart.receipt_cycle RENAME COLUMN brand TO l0_name;
ALTER TABLE item_smart.receipt_cycle RENAME COLUMN dept TO l1_name;
ALTER TABLE item_smart.receipt_cycle RENAME COLUMN subdept TO l2_name;
