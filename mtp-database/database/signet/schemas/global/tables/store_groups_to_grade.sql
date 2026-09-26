--liquibase formatted sql
--changeset swapnil.bhange:store_groups_to_grade_v2_1_2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21145
--comment: create table schema for store_groups_to_grade

CREATE TABLE if not exists "global".store_groups_to_grade (
    store_code varchar NOT null,
    "name" varchar NULL,
    grade varchar NOT null,
    sg_code int4  NOT NULL,
    is_deleted bool NULL DEFAULT false,
    created_at timestamptz NULL DEFAULT now(),
    updated_at timestamptz NULL DEFAULT now(),
    created_by int4 NULL,
    updated_by int4 NULL
);

-- "global".store_groups_to_grade foreign keys
ALTER TABLE  "global".store_groups_to_grade DROP CONSTRAINT IF EXISTS store_groups_to_grade_created_by_fk ;
ALTER TABLE  "global".store_groups_to_grade DROP CONSTRAINT IF EXISTS store_groups_to_grade_updated_at_fk ;
ALTER TABLE "global".store_groups_to_grade ADD CONSTRAINT store_groups_to_grade_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE "global".store_groups_to_grade ADD CONSTRAINT store_groups_to_grade_updated_at_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;

--changeset  swapnil.bhange:store_groups_to_grade_MTP-22124_3_NEW_1_2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22124
--comment: added new constraints schema for store_groups_to_grade

ALTER TABLE "global".store_groups_to_grade DROP CONSTRAINT IF EXISTS store_groups_to_grade_un ;
ALTER TABLE "global".store_groups_to_grade ADD CONSTRAINT store_groups_to_grade_un_1 UNIQUE (store_code,sg_code) ;

--changeset  swapnil.bhange:store_groups_to_grade_MTP-22124_4_NEW_1_2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22124
--comment: changed constraints for store_groups_to_grade

ALTER TABLE "global".store_groups_to_grade DROP CONSTRAINT IF EXISTS store_groups_to_grad_un ;

--changeset kakumanu.abhishek:store_groups_to_grade_NEW  stripComments:false splitStatements:false context:Release_1_0 labels:SAP-172
--comment: added store_channel column to store_groups_to_grade
ALTER TABLE "global".store_groups_to_grade ADD COLUMN IF NOT EXISTS  store_channel varchar NULL;


--changeset rishitha.gangadhara:store_groups_to_grade_2_new_1NEW_1_2 stripComments:false splitStatements:false context:Release_1_0 labels:SAP-172
--comment: added store_channel column to store_groups_to_grade_2
ALTER TABLE "global".store_groups_to_grade DROP CONSTRAINT IF EXISTS store_groups_to_grade_pk;
ALTER TABLE "global".store_groups_to_grade ADD CONSTRAINT store_groups_to_grade_pk PRIMARY KEY (store_code, sg_code);
