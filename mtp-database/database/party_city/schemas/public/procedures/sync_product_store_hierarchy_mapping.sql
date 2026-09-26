--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:sync_product_store_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-22383
--comment: initial changeset for sync_product_store_hierarchy_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_store_hierarchy_mapping(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
begin
  delete from "global".product_store_hierarchy_mapping 
  where true;
  insert into "global".product_store_hierarchy_mapping
     (
      mapping_key,	
      l0_name ,
      l1_name ,
      l2_name ,
      business_unit,
      group_id ,
      channel 
     )
  select
      mapping_key,
      l0_name ,
      l1_name ,
      l2_name ,
      business_unit ,
      group_id ,
      channel 
  from
    public.product_store_hierarchy_mapping;
end
$procedure$
;
