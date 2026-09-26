--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:product_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS "demand_smart".product_groups (
    pg_code serial4 NOT NULL,
    pg_name varchar NOT NULL,
    pg_type varchar NOT NULL,
    pg_description varchar NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by varchar(255) NULL,
    updated_by varchar(255) NULL,
    pg_selection_metadata json DEFAULT '{}'::json NOT NULL,
    pg_method varchar NOT NULL,
    CONSTRAINT pg_name_check CHECK ((length((pg_name)::text) > 0)),
    CONSTRAINT upg_pk PRIMARY KEY (pg_code)

);
CREATE UNIQUE INDEX IF NOT EXISTS product_groups_name_idx ON demand_smart.product_groups USING btree (pg_name);
ALTER TABLE IF EXISTS "demand_smart".product_groups 
ADD CONSTRAINT product_groups_pg_name_unique UNIQUE (pg_name);

CREATE SEQUENCE IF NOT EXISTS "demand_smart".product_groups_pg_code_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START 1
    CACHE 1
    NO cycle
     OWNED BY demand_smart.product_groups.pg_code;