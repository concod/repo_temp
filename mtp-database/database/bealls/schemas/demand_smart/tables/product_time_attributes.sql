--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:product_time_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS demand_smart.product_time_attributes(
    product_code varchar NOT NULL,
    attribute_name varchar NOT NULL,
    attribute_value varchar NOT NULL,
    start_time date DEFAULT '1990-01-01'::date NOT NULL,
    end_time date DEFAULT '2099-12-31'::date NOT NULL,
    product_time_attr_id bigserial NOT null,
    updated_by int4 NULL,
    l0_name varchar NOT NULL,
    updated_at timestamptz NULL,
    constraint product_time_attributes_pk primary key (product_time_attr_id,l0_name),
    CONSTRAINT end_time_chk CHECK ((end_time <= '2099-12-31'::date)),
    CONSTRAINT product_time_attributes_check CHECK ((end_time >= start_time)),
    CONSTRAINT start_time_chk CHECK ((start_time <= '2051-12-31'::date)),
    CONSTRAINT product_time_attributes_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE,
    CONSTRAINT product_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL
)
PARTITION BY LIST (l0_name);
 
-- Indexes
CREATE INDEX IF NOT EXISTS l0_name_attributes_idx ON demand_smart.product_time_attributes USING btree (l0_name, attribute_name);
CREATE INDEX IF NOT EXISTS product_time_attributes_indx1 ON demand_smart.product_time_attributes USING btree (start_time);
CREATE INDEX IF NOT EXISTS product_time_attributes_indx2 ON demand_smart.product_time_attributes USING btree (product_code);
 
-- Recommended additional index for join performance (based on new query analysis)
CREATE INDEX IF NOT EXISTS product_time_attributes_product_code_l0_name_idx ON demand_smart.product_time_attributes USING btree (product_code, l0_name);

-- Create sequence in demand_smart schema
CREATE SEQUENCE IF NOT EXISTS demand_smart.product_time_attributes_product_time_attr_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    START WITH 1  -- Start from 1 for new schema
    CACHE 1
    NO CYCLE
    OWNED BY demand_smart.product_time_attributes.product_time_attr_id;
