--liquibase formatted sql
--changeset ashvin.prasanth@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter

CREATE TABLE IF NOT EXISTS "global".store_attributes_filter (
	store_code varchar NOT NULL,
	region varchar NULL,
	country varchar NULL,
	district varchar NULL,
	age int4 NULL,
	channel varchar NULL,
	classification varchar NULL,
	close_date date NULL,
	dc_name varchar NULL,
	fc_name varchar NULL,
	location_indicator varchar NULL,
	location_type varchar NULL,
	"name" varchar NULL,
	open_date date NULL,
	zipcode varchar NULL,
	active bool NOT NULL,
	special_classification varchar NULL,
	is_deleted bool NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);

--changeset ashvin.prasanth@impactanalytics:store_attributes_filter_cols stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: store_attributes_filter missing cols
ALTER TABLE global.store_attributes_filter
ADD column IF NOT EXISTS dimensionlocation_skey int4 NULL ,
ADD column IF NOT EXISTS costcenter varchar NULL ,
ADD column IF NOT EXISTS cruiseline varchar NULL ,
ADD column IF NOT EXISTS dmcode varchar NULL ,
ADD column IF NOT EXISTS inactive varchar NULL ,
ADD column IF NOT EXISTS mustwinship varchar NULL ,
ADD column IF NOT EXISTS rentgroupcode varchar NULL ,
ADD column IF NOT EXISTS rentgroupname varchar NULL ,
ADD column IF NOT EXISTS txtlocationcode varchar NULL ,
ADD column IF NOT EXISTS vesselclass varchar NULL ,
ADD column IF NOT EXISTS isasia varchar NULL ,
ADD column IF NOT EXISTS region varchar NULL ,
ADD column IF NOT EXISTS etl_dimension_load_datetime varchar NULL ,
ADD column IF NOT EXISTS etl_dimension_update_datetime varchar NULL ,
ADD column IF NOT EXISTS etl_hash_columns varchar NULL ,
ADD column IF NOT EXISTS locationcapacity float8 NULL ,
ADD column IF NOT EXISTS dmname varchar NULL ,
ADD column IF NOT EXISTS itinn30d varchar NULL ,
ADD column IF NOT EXISTS itincurrent varchar NULL ,
ADD column IF NOT EXISTS itinl90dn90d varchar NULL ,
ADD column IF NOT EXISTS itinl3m varchar NULL ,
ADD column IF NOT EXISTS itinl2m varchar NULL ,
ADD column IF NOT EXISTS itinlm varchar NULL ,
ADD column IF NOT EXISTS itinnm varchar NULL ,
ADD column IF NOT EXISTS itinn2m varchar NULL ,
ADD column IF NOT EXISTS itinn3m varchar NULL ,
ADD column IF NOT EXISTS itinl3m_n3m varchar NULL ,
ADD column IF NOT EXISTS store_description varchar NULL,
ADD column IF NOT EXISTS store_name varchar NULL,
ADD column IF NOT EXISTS created_at timestamptz DEFAULT now() NULL,
ADD column IF NOT EXISTS updated_at timestamptz DEFAULT now() NULL,
ADD column IF NOT EXISTS created_by int4 NULL,
ADD column IF NOT EXISTS updated_by int4 NULL,
ADD column IF NOT EXISTS dc_code int4 NULL,
ADD column IF NOT EXISTS fc_code int4 NULL;


CREATE INDEX if not exists saf_active_common_idx ON global.store_attributes_filter USING btree (channel, special_classification) WHERE ((active = true) AND (is_deleted = false));

CREATE INDEX if not exists saf_common_idx ON global.store_attributes_filter USING btree (channel, special_classification);


--changeset ashvin.prasanth@impactanalytics:store_attributes_filter_cols_01 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: store_attributes_filter missing cols
ALTER TABLE global.store_attributes_filter
ADD column IF NOT EXISTS s0_name varchar NULL;

--changeset ashvin.prasanth@impactanalytics:store_attributes_filter_cols_02 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: store_attributes_filter missing cols


ALTER TABLE global.store_attributes_filter
    ADD COLUMN IF NOT EXISTS s1_name varchar,
    ADD COLUMN IF NOT EXISTS subchannel varchar,
    ADD COLUMN IF NOT EXISTS itineraryid varchar;

--changeset ashvin.prasanth@impactanalytics:store_attributes_filter_cols_03 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: store_attributes_filter missing cols

ALTER TABLE global.store_attributes_filter 
ADD COLUMN IF NOT EXISTS productstoretype varchar NULL;