--liquibase formatted sql
--changeset liquibase:depth_multiplier_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for depth_multiplier
CREATE TABLE if not exists assort.depth_multiplier (
    l0_name character varying NOT NULL,
    l1_name character varying,
    l2_name character varying,
    l3_name character varying,
    range integer,
    range_multiplier_l0 real,
    range_multiplier_l1 real,
    range_multiplier_l2 real,
    range_multiplier_l3 real,
    year integer,
    yearly_flag character varying,
    special_classification character varying
);

--changeset sadhana.j:depth_multiplier_sub_channel stripComments:false splitStatements:false context:sub_channel_col_added labels:liquibase_project_start
--comment: added new sub_channel column
ALTER TABLE assort.depth_multiplier ADD sub_channel varchar NULL;

