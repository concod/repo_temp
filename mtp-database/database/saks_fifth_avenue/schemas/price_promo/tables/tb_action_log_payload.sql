--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:tb_action_log_payload stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_action_log_payload


-- Create the table tb_action_log_payload
CREATE TABLE price_promo.tb_action_log_payload (
    id serial4 NOT NULL,
    action_log_id int4 NOT NULL,
    payload jsonb NULL,
    CONSTRAINT tb_action_log_payload_pk PRIMARY KEY (id)
);

-- Create index on action_log_id
CREATE INDEX idx_tb_action_log_payload_action_log_id 
    ON price_promo.tb_action_log_payload USING btree (action_log_id);

-- Add foreign key constraint
ALTER TABLE price_promo.tb_action_log_payload 
ADD CONSTRAINT tb_action_log_payload_fk 
FOREIGN KEY (action_log_id) 
REFERENCES price_promo.tb_action_log_master(id) 
ON DELETE CASCADE;


--changeset abhishek.singh@impactanalytics.co:tb_action_log_payload_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_action_log_payload

ALTER TABLE price_promo.tb_action_log_payload
DROP CONSTRAINT IF EXISTS tb_action_log_payload_fk;



--changeset abhishek.singh@impactanalytics.co:tb_action_log_payload_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_action_log_payload

ALTER TABLE price_promo.tb_action_log_payload 
ADD CONSTRAINT tb_action_log_payload_fk 
FOREIGN KEY (action_log_id) 
REFERENCES price_promo.tb_action_log_master(id) 
ON DELETE CASCADE;