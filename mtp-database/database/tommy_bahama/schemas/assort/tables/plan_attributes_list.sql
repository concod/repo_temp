--liquibase formatted sql
--changeset liquibase:plan_attributes_list_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_attributes_list
CREATE TABLE if not exists assort.plan_attributes_list (
    attribute_name name,
    is_hierarchy boolean,
    is_attribute boolean,
    is_main_col boolean,
    hierarchy_level integer,
    datatype name
);
