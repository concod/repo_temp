--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:update_placeholders_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_placeholders_info_initial_commit
--comment: initial changeset for update_placeholders_info
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.update_placeholders_info();
CREATE OR REPLACE PROCEDURE item_smart.update_placeholders_info()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Truncate the target table
    TRUNCATE TABLE item_smart.placeholders_info;

    -- Insert data from the source table
    INSERT INTO item_smart.placeholders_info
    SELECT *
    FROM public.placeholders_info;

END;
$$;