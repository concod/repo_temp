--liquibase formatted sql
--changeset ashish@impactanalytics.co:cold_update_merge_meta_updated runOnChange:true stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: initial changeset for cold_update_merge_meta
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.cold_update_merge_meta(_table_name character varying, _table_type character varying, _update_codes int[]);
CREATE OR REPLACE FUNCTION cache.cold_update_merge_meta(_table_name character varying, _table_type character varying, _update_codes integer[])
 RETURNS TABLE(fiscal_year_week integer, update_cols text, product_bucket_codes text)
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
	#variable_conflict use_column
	begin
		return query select 
		  fiscal_year_week::int4 as fiscal_year_week, 
		  string_agg(distinct col, ',') as update_cols, 
		  string_agg(distinct product_bucket_code, ',') as product_bucket_codes
		from 
		  (
		    select 
		      product_bucket_code, 
		      jsonb_array_elements_text(fiscal_year_week) as fiscal_year_week, 
		      col  
		    from 
		      (
		        select 
		          jsonb_array_elements_text(
		            (product_bucket_code->>'values')::jsonb
		          ) as product_bucket_code, 
		          (fiscal_year_week->>'values')::jsonb as fiscal_year_week, 
		          col 
		        from 
		          (
		            select 
		             jsonb_array_elements(product_bucket_code) as product_bucket_code, 
		              jsonb_array_elements(fiscal_year_week) as fiscal_year_week, 
		              col
		            from 
		              (
		                select 
		                  (
		                    select 
		                      (chunk->>'product_bucket_code')::jsonb 
		                    from 
		                      "cache".calculate_chunks(
		                        'ada_visual_predictions', filters
		                      )
		                  ) as product_bucket_code, 
		                  (filters->>'fiscal_year_week')::jsonb as fiscal_year_week, 
		                  update_code 
		                from 
		                  "cache".update_tracker 
		                where 
		                  table_name = _table_name
		                  and table_type = _table_type
		                  and not is_deleted 
		                  and status = 2
		                  and update_code = any(_update_codes)
		              ) x1 
		              join (
		                select 
		                  update_code, 
						  col
		                 -- string_agg(distinct col, ',') as update_cols 
		                from 
		                  "cache".update_details ud 
		                where 
		                  col not in('update_type') 
		                  and update_code = any(_update_codes)
		              ) ud using(update_code)
		          ) x2
		      ) x3
		  ) x4 
		group by 
		  1;
	END
$function$
;