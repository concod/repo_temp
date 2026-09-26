--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:remodel_effective_date_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for remodel_effective_date

CREATE TABLE IF NOT EXISTS "global".remodel_effective_date (
    store_code VARCHAR NOT NULL,
    effective_date DATE NOT NULL
);

--changeset anujkumar.singh@impactanalytics.co:remodel_effective_date_v2 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: schema update for remodel_effective_date
ALTER TABLE "global".remodel_effective_date RENAME COLUMN effective_date to temp_store_effective_date;
ALTER TABLE "global".remodel_effective_date ADD if not exists remodel_store_effective_date DATE NULL;
ALTER TABLE "global".remodel_effective_date ADD if not exists temp_store_code VARCHAR NULL;


--changeset kamuju.mahaveer@impactanalytics.co:remodel_effective_date_v3 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: schema update for remodel_effective_date
ALTER TABLE "global".remodel_effective_date ADD CONSTRAINT remodel_effective_date_pk PRIMARY KEY (store_code);

