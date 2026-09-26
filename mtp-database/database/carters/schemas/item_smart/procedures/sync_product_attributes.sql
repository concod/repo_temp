--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:sync_product_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for sync_product_attributes
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS item_smart.sync_product_attributes();

CREATE OR REPLACE PROCEDURE item_smart.sync_product_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Step 1: Delete data from target table
    EXECUTE 'DELETE FROM item_smart.product_attribute_hierarchy_mapping';

    -- Step 2: Alter the attribute column type in the source table to JSONB
    EXECUTE 'ALTER TABLE public.product_attribute_hierarchy_mapping_temp ALTER COLUMN "Attribute" TYPE JSONB USING "Attribute"::JSONB::JSONB';

    -- Step 3: Insert data from the source to the target table
    EXECUTE 'INSERT INTO item_smart.product_attribute_hierarchy_mapping 
             SELECT * FROM public.product_attribute_hierarchy_mapping_temp';
END;
$procedure$
;