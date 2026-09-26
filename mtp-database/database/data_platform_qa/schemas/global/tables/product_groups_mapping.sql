--liquibase formatted sql
--changeset liquibase:product_groups_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_groups_mapping
CREATE TABLE global.product_groups_mapping (
    pg_code integer NOT NULL,
    product_code character varying NOT NULL,
    ref_pg_code integer,
    avg_st_perc real,
    rev_con_perc real
);
ALTER TABLE global.product_groups_mapping
    ADD CONSTRAINT product_groups_mapping_un UNIQUE (pg_code, product_code);
ALTER TABLE global.product_groups_mapping
    ADD CONSTRAINT product_groups_mapping_fk FOREIGN KEY (pg_code) REFERENCES global.product_groups(pg_code) ON DELETE CASCADE;
ALTER TABLE global.product_groups_mapping
    ADD CONSTRAINT product_groups_mapping_product_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;
ALTER TABLE global.product_groups_mapping
    ADD CONSTRAINT product_groups_mapping_ref_pg_fk FOREIGN KEY (ref_pg_code) REFERENCES global.product_groups(pg_code);

--changeset kamaleshwaran.k@impactanalytics.co:product_groups_mapping_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.product_groups_mapping 
ADD CONSTRAINT product_groups_mapping_pk 
PRIMARY KEY (pg_code, product_code);

ALTER TABLE global.product_groups_mapping 
DROP CONSTRAINT product_groups_mapping_un;