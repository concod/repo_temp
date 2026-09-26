--liquibase formatted sql
--changeset liquibase:store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter
CREATE TABLE global.store_attributes_filter (
    store_code character varying NOT NULL,
    region character varying,
    country character varying,
    district character varying,
    age integer,
    channel character varying,
    classification character varying,
    close_date date,
    dc_name character varying,
    fc_name character varying,
    location_indicator character varying,
    location_type character varying,
    name character varying,
    open_date date,
    zipcode character varying
);
ALTER TABLE global.store_attributes_filter
    ADD CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code);


--changeset prashant.arya@impactanalytics.co:store_attributes_filter_cols stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: store_attributes_filter missing cols
ALTER TABLE global.store_attributes_filter ADD column IF NOT EXISTS active BOOL NOT NULL,
 ADD column IF NOT EXISTS special_classification VARCHAR NULL,
 ADD column IF NOT EXISTS is_deleted BOOL NULL;

--changeset ashish@impactanalytics.co:store_attributes_filter_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: store_attributes_filter FK
CREATE INDEX saf_active_common_idx ON "global".store_attributes_filter(channel, special_classification) WHERE active = true and is_deleted = false;
CREATE INDEX saf_common_idx ON "global".store_attributes_filter(channel, special_classification);

--changeset akshay.jain@impactanalytics.co:store_access_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding new column to store user access hierarchy id
ALTER TABLE global.store_attributes_filter 
ADD COLUMN IF NOT EXISTS store_access_hierarchy VARCHAR(255);