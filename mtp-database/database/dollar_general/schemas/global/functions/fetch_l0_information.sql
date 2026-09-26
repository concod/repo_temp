--liquibase formatted sql
--changeset liquibase:fetch_l0_information runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: first version in client level folder
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.fetch_l0_information(text[], text);
CREATE 
OR REPLACE FUNCTION global.fetch_l0_information(text[], text)
RETURNS TABLE(l0_name character varying, input_code character varying, output_code character varying) LANGUAGE plpgsql AS $function$ 
/*
Calling statement:
select * from global.fetch_aggregation_level
Updated_by Updated_on Purpose
---------- ----------- --------
Akshay Jian 21-Aug-2022 fetch aggregation level for client
*/
declare _final_query text;
aggr_level text;
_prod_lst text[] := array[$1]::text[];
begin
   aggr_level := global.fetch_aggregation_level();
if $2 = 'product' 
then
   _final_query := 'select l0_name, product_code, ' || aggr_level || ' from global.product_attributes_filter where product_code in (' || ARRAY_TO_STRING(ARRAY(
   SELECT
      quote_literal(elem) 
   FROM
      UNNEST(_prod_lst) elem), ',') || ')';
else
   _final_query := 'select unnest(l0_name), aggregation_code, unnest(products) from global.aggregation_level_filter where aggregation_code in (' || ARRAY_TO_STRING(ARRAY(
   SELECT
      quote_literal(elem) 
   FROM
      UNNEST(_prod_lst) elem), ',') || ')';
end
if;
RETURN QUERY execute _final_query;
end
$function$;
