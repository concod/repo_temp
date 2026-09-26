--liquibase formatted sql
--changeset liquibase:product_asn_dc_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_asn_dc_mapping
CREATE TABLE global.product_asn_dc_mapping (
    pasn_code integer NOT NULL,
    dc character varying,
    quantity real,
    quantity_perc real,
    CONSTRAINT dc_check CHECK ((length((dc)::text) > 0))
);
ALTER TABLE global.product_asn_dc_mapping
    ADD CONSTRAINT product_asn_dc_mapping_un UNIQUE (pasn_code, dc);
ALTER TABLE global.product_asn_dc_mapping
    ADD CONSTRAINT product_asn_dc_mapping_fk FOREIGN KEY (pasn_code) REFERENCES global.product_asn_master(pasn_code) ON DELETE CASCADE;

--changeset kamalesh.k@impactanalytics.co:product_asn_dc_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for product_asn_dc_mapping

ALTER TABLE "global".product_asn_dc_mapping
DROP CONSTRAINT IF EXISTS product_asn_dc_mapping_un;

ALTER TABLE "global".product_asn_dc_mapping 
  ALTER COLUMN dc SET NOT NULL;

ALTER TABLE "global".product_asn_dc_mapping
ADD CONSTRAINT product_asn_dc_mapping_pkey PRIMARY KEY (pasn_code, dc);
