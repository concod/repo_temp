--liquibase formatted sql
--changeset liquibase:update_or_insert_user_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_or_insert_user_attribute
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_or_insert_user_attribute(user_id integer, attr_name text, attr_value text, datatype text);
CREATE OR REPLACE FUNCTION global.update_or_insert_user_attribute(user_id integer, attr_name text, attr_value text, datatype text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE 
    BEGIN 
        UPDATE global.user_attributes SET attribute_value = $3 WHERE attribute_name = $2 AND user_code = $1; 
        IF NOT FOUND THEN
            INSERT INTO global.user_attributes (user_code, attribute_name, attribute_value, datatype) VALUES ($1, $2, $3, $4); 
        END IF;
    END;
$function$
;
