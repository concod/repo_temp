--liquibase formatted sql
--changeset adesh:product_supersession_get_mappings runOnChange:true stripComments:false splitStatements:false context:MTP-70703-get-mappings labels:MTP-70703
--comment: MTP-70703:size length difference old and new sizes for supersession mapping
--rollback: SELECT 1
--function fetches details of new supersession mapping;
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
	    SELECT new_article, product_description, size, size_name, product_code, l2_name new_l2_name, l3_name new_l3_name, l4_name new_l4_name, primary_trait_desc new_primary_trait_desc
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.new_article
	    group by 1,2,3,4,5,6,7,8,9
	)
	,old as (
	    SELECT old_article, product_description, size, size_name, product_code, l2_name old_l2_name, l3_name old_l3_name, l4_name old_l4_name, primary_trait_desc old_primary_trait_desc
	    FROM base
	    LEFT JOIN global.product_attributes_filter paf on paf.article = base.old_article
	    group by 1,2,3,4,5,6,7,8,9
	)
	,new_agg as (
		SELECT new_article, product_description as new_product_description,
	           new_l2_name, new_l3_name, new_l4_name, new_primary_trait_desc,
			   ARRAY_AGG(product_code) new_product_code,
		 	   ARRAY_AGG(product_code) new_product_code_all,
			   ARRAY_AGG(size) new_size,
			   ARRAY_AGG(size) new_size_all,
	           ARRAY_AGG(size_name) new_size_name_all
		FROM new
		GROUP BY 1, 2, 3, 4, 5, 6
	)
	,old_agg as (
	    SELECT old_article, product_description as old_product_description,
	           old_l2_name, old_l3_name, old_l4_name, old_primary_trait_desc,
			   ARRAY_AGG(product_code) old_product_code,
	  		   ARRAY_AGG(product_code) old_product_code_all,
			   ARRAY_AGG(size) old_size,
			   ARRAY_AGG(size) old_size_all,
	           ARRAY_AGG(size_name) old_size_name_all
	    FROM old
		GROUP BY 1, 2, 3, 4, 5, 6
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
        GREATEST(array_length(old_product_code_all, 1), array_length(new_product_code_all, 1)) AS max_product_code_all_length,
        GREATEST(array_length(old_size, 1), array_length(new_size, 1)) AS max_size_length,
        GREATEST(array_length(old_size_all, 1), array_length(new_size_all, 1)) AS max_size_all_length,
        GREATEST(array_length(old_size_name_all, 1), array_length(new_size_name_all, 1)) AS max_size_name_all_length
    FROM final_table
)

SELECT
    old_article, new_article, new_product_description, new_l2_name, new_l3_name, new_l4_name, new_primary_trait_desc,
    old_product_description, old_l2_name, old_l3_name, old_l4_name, old_primary_trait_desc,
    COALESCE(
        old_product_code || array_fill(NULL::text, ARRAY[max_product_code_length - array_length(old_product_code, 1)]),
        old_product_code
    ) AS old_product_code,
    COALESCE(
        new_product_code || array_fill(NULL::text, ARRAY[max_product_code_length - array_length(new_product_code, 1)]),
        new_product_code
    ) AS new_product_code,

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