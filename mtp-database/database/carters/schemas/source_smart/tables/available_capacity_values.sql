--liquibase formatted sql
--changeset liquibase:available_capacity_values stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for available_capacity_values
CREATE TABLE source_smart.available_capacity_values (
    rule_id varchar(255) NOT NULL,
    value_id varchar(255) NOT NULL,
    units numeric(12, 4) NULL,
    smv numeric(12, 4) NULL,
    start_date date NULL,
    end_date date NULL,
    CONSTRAINT pk_ac_vid PRIMARY KEY (value_id),
    CONSTRAINT fk_ac_rid FOREIGN KEY (rule_id) REFERENCES source_smart.available_capacity_rule(rule_id) ON DELETE CASCADE
);