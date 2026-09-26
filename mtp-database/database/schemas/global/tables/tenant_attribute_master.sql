--liquibase formatted sql
--changeset liquibase:tenant_attribute_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_attribute_master
CREATE TABLE global.tenant_attribute_master (
    attribute_code serial4 NOT NULL,
    name varchar,
    attribute_type varchar,
    description varchar,
    status boolean,
    attribute_value jsonb,
    application_code integer
);
ALTER TABLE global.tenant_attribute_master
    ADD CONSTRAINT attributes_master_pk PRIMARY KEY (attribute_code);
ALTER TABLE "global".tenant_attribute_master ADD CONSTRAINT tenant_attribute_master_un UNIQUE ("name",attribute_type,application_code);

--changeset raj.mohan@impactanalytics.co:tenant_attribute_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding user_edited column on  tenant_attribute_master
ALTER TABLE GLOBAL.tenant_attribute_master ADD COLUMN user_edited boolean default false;

--changeset gautam.baruah@impactanalytics.co:tenant_attribute_master_v1 stripComments:false splitStatements:false context:MTP_38146 labels:liquibase_project_start
--comment: added module_code column and constraint
ALTER TABLE "global".tenant_attribute_master ADD COLUMN module_code int4 NULL;
ALTER TABLE "global".tenant_attribute_master ADD CONSTRAINT tenant_attribute_module_fk FOREIGN KEY (module_code) REFERENCES "global".module_master(module_code); 
