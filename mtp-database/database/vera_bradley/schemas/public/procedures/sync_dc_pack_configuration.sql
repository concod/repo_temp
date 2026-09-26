--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:sync_dc_pack_configuration runOnChange:true stripComments:false splitStatements:false context:MTP-15158 labels:liquibase_project_start
--comment: initial changeset for sync_dc_pack_configuration
--rollback: SELECT 1 
DROP PROCEDURE IF EXISTS public.sync_dc_pack_configuration();
CREATE OR REPLACE PROCEDURE public.sync_dc_pack_configuration()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	begin
 		delete from 
 		  inventory_smart.dc_pack_configuration 
 		;
 		INSERT INTO inventory_smart.dc_pack_configuration (
 		 article,
 		pack_type_id,
 		pack_type,
 		product_code,
 		size,
 		units_in_pack,
 		parent_article,
 		pack_description
 		) 
 		
SELECT  paf.article , x.parent_product_code as pack_type_id, 'packs' pack_type, paf.product_code product_code,
 		paf."size" as size,
 		x.bom_quantity units_in_pack,paf2.article as parent_article, paf2.product_description  as pack_description
 		FROM public.bom_latest x join 
 		global.product_attributes_filter paf 
 		on x.child_product_code =paf.product_code 
 		join 
 		global.product_attributes_filter paf2 
 		on x.parent_product_code =paf2.product_code ;
 	end
 $procedure$
;
