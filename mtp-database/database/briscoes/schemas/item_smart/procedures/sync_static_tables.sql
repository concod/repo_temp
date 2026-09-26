--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:sync_static_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-20302
--comment: added SP for sync_static_tables
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_static_tables(text, text);

CREATE OR REPLACE PROCEDURE public.sync_static_tables(IN p_target_table text, IN p_source_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_sql text;
BEGIN
   
    v_sql := format('DELETE FROM item_smart.%s;', p_target_table);
    EXECUTE v_sql;
    
    v_sql := format(
        'INSERT INTO item_smart.%s SELECT * FROM %s;',
        p_target_table, p_source_table
    );
    
    EXECUTE v_sql;
END
$procedure$
;