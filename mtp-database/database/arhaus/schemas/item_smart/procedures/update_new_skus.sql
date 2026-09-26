--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:update_new_skus runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_new_skus_initial_commit
--comment: initial changeset for update_new_skus
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.update_new_skus();
CREATE OR REPLACE PROCEDURE item_smart.update_new_skus()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Truncate the target table
    TRUNCATE TABLE item_smart.new_skus;

    -- Insert data from the source table
    INSERT INTO item_smart.new_skus
    SELECT *
    FROM public.new_skus;

END;
$$;