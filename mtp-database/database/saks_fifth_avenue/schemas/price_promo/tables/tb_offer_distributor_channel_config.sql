--liquibase formatted sql
--changeset liquibase:tb_offer_distributor_channel_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_offer_distributor_channel_config
CREATE TABLE "price_promo"."tb_offer_distributor_channel_config" (
    id int4 NOT NULL,
    channel varchar NULL
);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_offer_distributor_channel_config_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.tb_offer_distributor_channel_config

ALTER TABLE price_promo.tb_offer_distributor_channel_config
    ALTER COLUMN id SET NOT NULL;

ALTER TABLE price_promo.tb_offer_distributor_channel_config
    ALTER COLUMN channel TYPE price_promo.offer_distributor_channel_enum USING channel::text::price_promo.offer_distributor_channel_enum;

-- Step 5: Add the unique constraint
ALTER TABLE price_promo.tb_offer_distributor_channel_config
    ADD CONSTRAINT tb_offer_distributor_channel_config_ukey UNIQUE (id, channel);

-- Step 6: Ensure the primary key constraint
ALTER TABLE price_promo.tb_offer_distributor_channel_config
    ADD CONSTRAINT tb_offer_distributor_channel_config_pkey PRIMARY KEY (id);

-- Step 7: Create the necessary indexes
CREATE INDEX idx_offer_distributor_channel_id 
    ON price_promo.tb_offer_distributor_channel_config USING btree (id);



--changeset abhishek.singh@impactanalytics.co:tb_offer_distributor_channel_config_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.tb_offer_distributor_channel_config

ALTER TABLE price_promo.tb_offer_distributor_channel_config
    DROP CONSTRAINT tb_offer_distributor_channel_config_ukey;
-- Step 2: Alter the column type from discount_level_value_enum to VARCHAR
ALTER TABLE price_promo.tb_offer_distributor_channel_config
    DROP COLUMN IF EXISTS channel;
    
ALTER TABLE price_promo.tb_offer_distributor_channel_config
    ADD COLUMN channel VARCHAR NOT NULL;
