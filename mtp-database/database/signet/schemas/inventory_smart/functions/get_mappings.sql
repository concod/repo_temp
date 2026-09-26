--liquibase formatted sql
--changeset liquibase:get_mappings runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:47705
--comment: Priority changes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_mappings(input refcursor, mapping_json jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_mappings(input refcursor, mapping_json jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_mappings_sql  text:='';
begin                          
  v_get_mappings_sql :='
	WITH new_base as (
		SELECT key old_article, value new_article FROM JSON_EACH_TEXT('''||concat(mapping_json)||''')	
  	)
    ,base as (
		select old_article, new_article, MAX(start_date) start_date, MAX(end_date) end_date, MAX(priority) priority from (
			SELECT smt.old_article, smt.new_article, smt.start_date, smt.end_date, smt.priority from inventory_smart.style_mapping_table smt 
			JOIN new_base on new_base.new_article = smt.new_article
			WHERE smt.old_article is not NULL
			UNION 
			select *, null start_date, null end_date, -1 priority from new_base
		) tmp 
		GROUP BY old_article, new_article
    )
	,new as (
	    SELECT new_article, 
    					product_description new_product_description, 
    					product_channel_name new_product_channel_name, 
    					
	           	l0_name new_l0_name, 
    					l1_name new_l1_name, 
    					l2_name new_l2_name,
    
    					merchandise_category new_merchandise_category,
              planning_ownership new_planning_ownership,
              merchandise_brand new_merchandise_brand,
    
    					size, 
    					product_code
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.new_article
	    WHERE active
	    GROUP BY 1, 2, 3, 4, 5, 6, 7,8,9,10,11
	)
	,old as (
	    SELECT old_article, 
    					product_description old_product_description, 
    					product_channel_name old_product_channel_name, 
    					
	           	l0_name old_l0_name, 
    					l1_name old_l1_name, 
    					l2_name old_l2_name,
    
    					merchandise_category old_merchandise_category,
              planning_ownership old_planning_ownership,
              merchandise_brand old_merchandise_brand,
    					size, 
    					product_code
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.old_article
	    WHERE active
	    GROUP BY 1, 2, 3, 4, 5, 6, 7,8,9,10,11
	)
	,new_agg as (
		SELECT new_article, new_product_description, new_product_channel_name, 
    					new_l0_name, new_l1_name, new_l2_name,
   						new_merchandise_category, new_planning_ownership, new_merchandise_brand,
		 	   ARRAY_AGG(product_code) new_product_code_all,
			   ARRAY_AGG(size) new_size_all
		FROM new
		GROUP BY 1, 2, 3, 4, 5,6,7,8,9
	)
	,old_agg as (
	    SELECT old_article, old_product_description, old_product_channel_name, 
    					old_l0_name, old_l1_name, old_l2_name,
   						old_merchandise_category, old_planning_ownership, old_merchandise_brand,
	  		   		ARRAY_AGG(product_code) old_product_code_all,
			   			ARRAY_AGG(size) old_size_all,
              ARRAY_AGG(size) old_size_name_all
	    FROM old
		GROUP BY 1, 2, 3, 4, 5,6,7,8,9
	)
	,combined as (
	    SELECT new_article, old.old_article,
	           ARRAY_AGG(new.product_code) new_product_code,
	           ARRAY_AGG(new.size) new_size,
	           ARRAY_AGG(old.product_code) old_product_code,
	           ARRAY_AGG(old.size) old_size
	    FROM base
	    JOIN new USING(new_article)
	    JOIN old ON base.old_article = old.old_article AND new.size = old.size
	    GROUP BY 1, 2
	)
	SELECT * FROM base
	LEFT JOIN combined USING(new_article, old_article)
	LEFT JOIN new_agg USING(new_article)
	LEFT JOIN old_agg USING(old_article)
    ';
          
  
  raise notice 'v_get_mappings_sql %',v_get_mappings_sql;
  open $1 for execute v_get_mappings_sql;
  RETURN $1;
end
$function$
;