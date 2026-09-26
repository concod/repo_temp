--liquibase formatted sql
--changeset liquibase:sync_uom runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_uom
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_uom();
CREATE OR REPLACE PROCEDURE public.sync_uom()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  inventory_smart.uom 
		where 
		  true;
		INSERT INTO inventory_smart.uom (
		  from_unit_description, factor, to_unit_description, 
		  item_id, from_unit, to_unit, "date"
		) 
		SELECT 
		  from_unit_description, 
		  factor, 
		  to_unit_description, 
		  item_id, 
		  from_unit, 
		  to_unit, 
		  "date" 
		FROM 
		  public.uom_latest;
end
$procedure$
;
