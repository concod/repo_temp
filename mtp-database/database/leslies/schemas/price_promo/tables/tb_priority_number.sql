--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_priority_number  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_priority_number


-- Create the table using ENUM and set id as primary key
CREATE TABLE price_promo.tb_priority_number (
    id int4 NOT NULL,
    priority_number int4 NOT NULL,
    offer_type price_promo.priority_offer_type_enum NULL,
    priority_display_name varchar NOT NULL,
    is_active int4 NOT NULL,
    CONSTRAINT tb_priority_number_pkey PRIMARY KEY (id),
    CONSTRAINT tb_priority_number_ukey UNIQUE (priority_number, offer_type)
);

-- Create an index on priority_number for better query performance
CREATE INDEX idx_priority_number 
    ON price_promo.tb_priority_number USING btree (priority_number);

--changeset nikhil.shet@impactanalytics.co:tb_priority_number_26052025_lesl  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Combined ALTER statement to transform tb_priority_number
ALTER TABLE price_promo.tb_priority_number 
    DROP CONSTRAINT tb_priority_number_pkey,
    DROP CONSTRAINT tb_priority_number_ukey,
    DROP COLUMN id,
    ALTER COLUMN offer_type TYPE varchar,
    ADD CONSTRAINT tb_priority_number_pkey PRIMARY KEY (priority_number);