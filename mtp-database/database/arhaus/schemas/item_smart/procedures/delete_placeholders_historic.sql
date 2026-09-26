--liquibase formatted sql
--changeset suchithra.pr@impactanalytics.co:delete_placeholders_historic runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for item_smart.delete_placeholders_historic
--rollback: SELECT 1



DROP PROCEDURE IF EXISTS item_smart.delete_placeholders_historic();

CREATE OR REPLACE PROCEDURE item_smart.delete_placeholders_historic()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
begin
	
	DELETE FROM item_smart.placeholders_info
    where is_cadence_generated = TRUE;
  

   
END;
$procedure$
;
