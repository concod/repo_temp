--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:store_time_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS demand_smart.store_time_attributes (
    store_code varchar NOT NULL,
    attribute_name varchar NOT NULL,
    attribute_value varchar NOT NULL,
    start_time date DEFAULT '1990-01-01'::date NOT NULL,
    end_time date DEFAULT '2045-12-31'::date NOT NULL,
    store_time_attr_id bigserial NOT NULL ,
    updated_by int4 NULL,
    updated_at timestamptz NULL,
    CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date)),
    CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date)),
    CONSTRAINT store_time_attributes_check CHECK ((end_time >= start_time)),
    CONSTRAINT store_time_attributes_pk PRIMARY KEY (store_code, attribute_name, start_time),
    CONSTRAINT store_time_attributes_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
    CONSTRAINT store_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS store_time_attributes_indx ON demand_smart.store_time_attributes USING btree (start_time);
CREATE INDEX IF NOT EXISTS store_time_attributes_indx1 ON demand_smart.store_time_attributes USING btree (attribute_name);
CREATE UNIQUE INDEX IF NOT EXISTS store_time_attributes_store_code_idx ON demand_smart.store_time_attributes USING btree (store_code, attribute_name, start_time, end_time);


-- Create sequence in demand_smart schema
CREATE SEQUENCE IF NOT EXISTS demand_smart.store_time_attributes_store_time_attr_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    START WITH 1  -- Start from 1 for new schema
    CACHE 1
    NO CYCLE
    OWNED BY demand_smart.store_time_attributes.store_time_attr_id;