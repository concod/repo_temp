--liquibase formatted sql
--changeset liquibase:store_hierarchies stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_hierarchies
CREATE TABLE global.store_hierarchies (
    store_code character varying NOT NULL,
    hierarcy_name character varying,
    hierarcy_value json DEFAULT '{}'::json NOT NULL
);
ALTER TABLE global.store_hierarchies
    ADD CONSTRAINT store_hierarchies_fk FOREIGN KEY (store_code) REFERENCES global.store_master(store_code) ON DELETE CASCADE;
