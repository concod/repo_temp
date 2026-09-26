--liquibase formatted sql
--changeset shreyansh.pathak@impactanalytics.co:itemfact_configurations stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_configurations_initial_commit
--comment: initial changeset for itemfact_configurations
CREATE TABLE item_smart.itemfact_configurations (
    sku_status varchar NOT NULL,
    itemfact_name varchar NOT NULL,
    itemfact_label varchar NOT NULL,
    mandatory boolean NOT NULL,
    nullable_on_ui boolean NOT NULL,
    editability boolean NOT NULL
);

--changeset shreyansh.pathak@impactanalytics.co:itemfact_configurations_changes stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_configurations_initial_commit
--comment: adding the order column in itemfact_configurations

ALTER TABLE item_smart.itemfact_configurations ADD COLUMN "order" integer NOT NULL;
ALTER TABLE item_smart.itemfact_configurations ADD COLUMN "type" varchar NOT NULL;
ALTER TABLE item_smart.itemfact_configurations ADD COLUMN "itemfact_type" varchar NOT NULL;