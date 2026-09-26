--liquibase formatted sql
--changeset liquibase:ty_receipt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ty_receipt
CREATE TABLE global.ty_receipt (
    l0_name character varying(1024),
    l1_name character varying(1024),
    l2_name character varying(1024),
    fy integer,
    fm double precision,
    ty_rcpt_retail double precision,
    store_type character varying(1024),
    ty_rcpt_units integer,
    ty_rcpt_cost double precision
);

--changeset kamalesh.k:ty_receipt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to ty_receipt table

ALTER TABLE global.ty_receipt
Add column ty_receipt_code serial4,
ADD CONSTRAINT ty_receipt_pkey PRIMARY KEY (ty_receipt_code);
