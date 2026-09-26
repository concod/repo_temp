--liquibase formatted sql
--changeset liquibase:product_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_list(jsonb, jsonb, jsonb, jsonb, collist character varying);
CREATE OR REPLACE FUNCTION global.product_store_list(jsonb, jsonb, jsonb, jsonb, collist character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	
ref1 refcursor := 'cur_prod_store';
v_query text;
v_final_query text;
BEGIN

 select global.products_store_filters($1,$2,$3,$4) into v_query ;

---raise notice '%', v_query; 
v_final_query:= 'SELECT distinct ' || colList || ' FROM ('||v_query||') x';
raise notice '%', v_final_query; 

open ref1 for execute v_final_query; 

 RETURN ref1;


END
$function$
;
