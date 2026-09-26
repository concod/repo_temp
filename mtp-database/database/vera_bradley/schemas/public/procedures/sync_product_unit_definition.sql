--liquibase formatted sql
--changeset liquibase:sync_product_unit_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_unit_definition
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_unit_definition();
CREATE OR REPLACE PROCEDURE public.sync_product_unit_definition()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		INSERT INTO "global".product_unit_definitions (
		  "name", description, definition_type, 
		  pack_quantity, metric_type, source_pud_code
		) 
		SELECT 
		  "name", 
		  description, 
		  definition_type, 
		  pack_quantity, 
		  metric_type, 
		  pud_code 
		FROM 
		  public.product_unit_definitions on conflict(source_pud_code) do 
		update 
		set 
		  "name" = excluded."name", 
		  description = excluded.description, 
		  definition_type = excluded.definition_type, 
		  pack_quantity = excluded.pack_quantity, 
		  metric_type = excluded.metric_type;
		INSERT INTO "global".product_unit_definition_metrics (
		  pud_code, "size", color, value, product_code
		) 
		SELECT 
		  pud.pud_code, 
		  pas.attribute_value, 
		  pac.attribute_value, 
		  quantity, 
		  product_code 
		FROM 
		  public.product_unit_definition_metrics x 
		  join "global".product_unit_definitions pud on x.pud_code = pud.source_pud_code 
		  left join (
		    select 
		      * 
		    from 
		      global.product_attributes 
		    where 
		      attribute_name = 'size'
		  ) pas using(product_code) 
		  left join (
		    select 
		      * 
		    from 
		      global.product_attributes 
		    where 
		      attribute_name = 'color'
		  ) pac using(product_code) on conflict(pud_code, product_code) do 
		update 
		set 
		  "size" = excluded."size", 
		  color = excluded.color, 
		  value = excluded.value;
	end
$procedure$
;
