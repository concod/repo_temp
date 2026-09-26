--liquibase formatted sql
--changeset liquibase:get_application_code_from_acl runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_application_code_from_acl

DROP FUNCTION IF EXISTS global.get_application_code_from_acl(INT4);
CREATE OR REPLACE FUNCTION global.get_application_code_from_acl(acl_code_param INT4)
RETURNS INT4
IMMUTABLE AS $$
BEGIN
    RETURN (SELECT application_code FROM global.acl_master WHERE acl_code = acl_code_param);
END;
$$ LANGUAGE plpgsql;
