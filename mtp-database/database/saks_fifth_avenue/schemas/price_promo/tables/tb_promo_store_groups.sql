--liquibase formatted sql
--changeset liquibase:tb_promo_store_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_promo_store_groups
CREATE TABLE "price_promo"."tb_promo_store_groups" (
    promo_id int4 NOT NULL,
    store_group_id int4 NOT NULL
)
;


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_promo_store_groups_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_promo_store_groups

-- Add the missing column
ALTER TABLE price_promo.tb_promo_store_groups
    ADD COLUMN store_group_name varchar(100) NOT NULL;

-- Drop the existing primary key constraint (if any) and recreate it
ALTER TABLE price_promo.tb_promo_store_groups
    DROP CONSTRAINT IF EXISTS tb_promo_store_groups_pkey;

ALTER TABLE price_promo.tb_promo_store_groups
    ADD CONSTRAINT tb_promo_store_groups_pkey PRIMARY KEY (promo_id, store_group_id);

-- Drop existing indexes (if any) and recreate them
DROP INDEX IF EXISTS tb_promo_store_groups_promo_id_idx;
DROP INDEX IF EXISTS tb_promo_store_groups_promo_id_store_group_id_idx;

CREATE INDEX tb_promo_store_groups_promo_id_idx 
    ON price_promo.tb_promo_store_groups USING btree (promo_id);
CREATE INDEX tb_promo_store_groups_promo_id_store_group_id_idx 
    ON price_promo.tb_promo_store_groups USING btree (promo_id, store_group_id);


--changeset sidharth.harish@impactanalytics.co:tb_promo_store_groups_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: varchar to text
ALTER TABLE price_promo.tb_promo_store_groups ALTER COLUMN store_group_name TYPE text USING store_group_name::text;
