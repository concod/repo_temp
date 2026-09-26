--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_action_log_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_action_log_master


-- Create the table tb_action_log_master
CREATE TABLE price_promo.tb_action_log_master (
    id serial4 NOT NULL,
    promo_ids_selection _int4 NULL,
    screen_type varchar NOT NULL,
    action_name varchar NOT NULL,
    status int8 NOT NULL,
    created_by int8 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_by int8 NULL,
    updated_at timestamp NULL,
    end_point varchar NULL,
    CONSTRAINT tb_action_log_master_pk PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX idx_tb_action_log_master_id 
    ON price_promo.tb_action_log_master USING btree (id);
CREATE INDEX idx_tb_action_log_master_status 
    ON price_promo.tb_action_log_master (status);


--changeset abhishek.singh@impactanalytics.co:tb_action_log_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_action_log_master

ALTER TABLE price_promo.tb_action_log_master
    RENAME COLUMN promo_ids_selection TO promo_ids;
    
ALTER TABLE price_promo.tb_action_log_master
    DROP COLUMN IF EXISTS end_point;
    
  
  
--changeset abhishek.singh@impactanalytics.co:tb_action_log_master_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_action_log_master  

ALTER TABLE price_promo.tb_action_log_master
    RENAME COLUMN screen_type TO screen_name;
ALTER TABLE price_promo.tb_action_log_master
    RENAME COLUMN action_name TO processing_action;
ALTER TABLE price_promo.tb_action_log_master
    RENAME COLUMN status TO processing_status;
    
-- Drop old index
DROP INDEX IF EXISTS idx_tb_action_log_master_status;

-- Create new index
CREATE INDEX idx_tb_action_log_master_operation_status 
ON price_promo.tb_action_log_master USING btree (processing_status);