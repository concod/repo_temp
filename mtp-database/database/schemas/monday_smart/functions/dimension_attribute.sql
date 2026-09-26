--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:dimension_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updation of the if condition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS monday_smart.dimension_attribute(input character varying);
CREATE OR REPLACE FUNCTION monday_smart.dimension_attribute(input character varying)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
    begin
	    if  $1 ='basket_composition'  or $1 ='style_type'  or  $1 ='price_bucket_tag'  or $1 ='basket_size' 
	    or  $1 ='season'  or $1 ='price_bucket'  or  $1 ='promo_type'  or $1 ='discount_flag' 
	    or  $1 ='channel'  or $1 ='promo_flag' or $1 ='s1_id'  or  $1 ='start_year'
	    
	    then 
	    
  RETURN query execute 'select   attribute_value FROM monday_smart.dimension_attributes_internal where attribute_name= '''||$1||''' group by 1  ;';
	else
	 RETURN query execute 'select   attribute_value FROM global.product_attributes where attribute_name= '''||$1||''' group by 1 ;  ';

end if ;
    end;
$function$
;
