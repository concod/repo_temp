--liquibase formatted sql
--changeset adesh:product_supersession_get_mappings_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-89597 labels:MTP-89597
--comment: MTP-98066:aggregate-upc-orig-in-product_supersession_get_mappings
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_mappings(refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_mappings(input refcursor, mapping_json jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_get_mappings_sql  text:='';
begin
                                         
  v_get_mappings_sql := '
	WITH base as (
		SELECT key old_article, value new_article FROM JSON_EACH_TEXT('''||concat(mapping_json)||'''))
	,new as (
	    SELECT new_article, article_orig as new_article_orig, upc_orig, product_description, size, product_code, l1_name new_l1_name, l2_name new_l2_name, l3_name new_l3_name, l4_name new_l4_name, l5_name new_l5_name,  l6_name new_l6_name, l8_name new_l8_name, assortment_indicator new_assortment_indicator
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.new_article
	    group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14
	)
	,old as (
	    SELECT old_article, article_orig as old_article_orig, upc_orig, product_description, size, product_code, l1_name old_l1_name, l2_name old_l2_name, l3_name old_l3_name, l4_name old_l4_name, l5_name old_l5_name, l6_name old_l6_name, l8_name old_l8_name, assortment_indicator old_assortment_indicator
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.old_article
	    group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14
	)
	,new_agg as (
		SELECT new_article, new_article_orig, product_description as new_product_description,
	           new_l1_name, new_l2_name, new_l3_name, new_l4_name, new_l5_name, new_l6_name, new_l8_name, new_assortment_indicator,
			   ARRAY_AGG(product_code) new_product_code,
			   ARRAY_AGG(upc_orig) new_upc_orig,
		 	   ARRAY_AGG(product_code) new_product_code_all,
			   ARRAY_AGG(size) new_size,
			   ARRAY_AGG(size) new_size_all,
			   ARRAY_AGG(size) new_size_name_all
		FROM new
		GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
	)
	,old_agg as (
	    SELECT old_article, old_article_orig, product_description as old_product_description,
	           old_l1_name, old_l2_name, old_l3_name, old_l4_name, old_l5_name, old_l6_name, old_l8_name, old_assortment_indicator,
			   ARRAY_AGG(product_code) old_product_code,
			   ARRAY_AGG(upc_orig) old_upc_orig,
	  		   ARRAY_AGG(product_code) old_product_code_all,
			   ARRAY_AGG(size) old_size,
			   ARRAY_AGG(size) old_size_all,
			   ARRAY_AGG(size) old_size_name_all
	    FROM old
		GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
	)
	,combined as (
	    SELECT new_article, old.old_article
	    FROM base
	    JOIN new USING(new_article)
	    JOIN old ON base.old_article = old.old_article AND new.size = old.size
	    GROUP BY 1, 2
	),
	final_table as (
	SELECT * FROM base
	LEFT JOIN combined USING(new_article, old_article)
	LEFT JOIN new_agg USING(new_article)
	LEFT JOIN old_agg USING(old_article)
	),
	updated_data AS (
     SELECT
        *,
        GREATEST(array_length(old_product_code, 1), array_length(new_product_code, 1)) AS max_product_code_length,
        GREATEST(array_length(old_upc_orig, 1), array_length(new_upc_orig, 1)) AS max_upc_orig_length,
        GREATEST(array_length(old_product_code_all, 1), array_length(new_product_code_all, 1)) AS max_product_code_all_length,
        GREATEST(array_length(old_size, 1), array_length(new_size, 1)) AS max_size_length,
        GREATEST(array_length(old_size_all, 1), array_length(new_size_all, 1)) AS max_size_all_length,
        GREATEST(array_length(old_size_name_all, 1), array_length(new_size_name_all, 1)) AS max_size_name_all_length
    FROM final_table
)
SELECT
    old_article, new_article, old_article_orig, new_article_orig, new_product_description, new_l1_name, new_l2_name, new_l3_name, new_l4_name, new_l5_name, new_l6_name, new_l8_name, new_assortment_indicator,
    old_product_description, old_l1_name, old_l2_name, old_l3_name, old_l4_name, old_l5_name, old_l6_name, old_l8_name, old_assortment_indicator,
    COALESCE(
        old_product_code || array_fill(NULL::text, ARRAY[max_product_code_length - array_length(old_product_code, 1)]),
        old_product_code
    ) AS old_product_code,
    COALESCE(
        new_product_code || array_fill(NULL::text, ARRAY[max_product_code_length - array_length(new_product_code, 1)]),
        new_product_code
    ) AS new_product_code,
    COALESCE(
        old_upc_orig || array_fill(NULL::text, ARRAY[max_upc_orig_length - array_length(old_upc_orig, 1)]),
        old_upc_orig
    ) AS old_upc_orig,
    COALESCE(
        new_upc_orig || array_fill(NULL::text, ARRAY[max_upc_orig_length - array_length(new_upc_orig, 1)]),
        new_upc_orig
    ) AS new_upc_orig,
    COALESCE(
        old_product_code_all || array_fill(NULL::text, ARRAY[max_product_code_all_length - array_length(old_product_code_all, 1)]),
        old_product_code_all
    ) AS old_product_code_all,
    COALESCE(
        new_product_code_all || array_fill(NULL::text, ARRAY[max_product_code_all_length - array_length(new_product_code_all, 1)]),
        new_product_code_all
    ) AS new_product_code_all,
    COALESCE(
        old_size || array_fill(NULL::text, ARRAY[max_size_length - array_length(old_size, 1)]),
        old_size
    ) AS old_size,
    COALESCE(
        new_size || array_fill(NULL::text, ARRAY[max_size_length - array_length(new_size, 1)]),
        new_size
    ) AS new_size,
    COALESCE(
        old_size_all || array_fill(NULL::text, ARRAY[max_size_all_length - array_length(old_size_all, 1)]),
        old_size_all
    ) AS old_size_all,
    COALESCE(
        new_size_all || array_fill(NULL::text, ARRAY[max_size_all_length - array_length(new_size_all, 1)]),
        new_size_all
    ) AS new_size_all,
    COALESCE(
        old_size_name_all || array_fill(NULL::text, ARRAY[max_size_name_all_length - array_length(old_size_name_all, 1)]),
        old_size_name_all
    ) AS old_size_name_all,
    COALESCE(
        new_size_name_all || array_fill(NULL::text, ARRAY[max_size_name_all_length - array_length(new_size_name_all, 1)]),
        new_size_name_all
    ) AS new_size_name_all
	FROM updated_data';
  raise notice 'v_get_mappings_sql %',v_get_mappings_sql;
  open $1 for execute v_get_mappings_sql;
  RETURN $1;
end
$function$
;