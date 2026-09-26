--liquibase formatted sql
--changeset liquibase:sync_article_store_grade runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_article_store_grade
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_store_grade();
CREATE OR REPLACE PROCEDURE public.sync_article_store_grade()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	begin
 		delete from 
 		  inventory_smart.article_store_grade 
 		where 
 		  true;
 		INSERT INTO inventory_smart.article_store_grade (
 		  article, store_code, grade, ph_code
 		) 
 		SELECT 
 		  article, 
 		  x.store_code, 
 		  grade, 
 		  hierarchy_code as ph_code 
 		FROM 
 		  public.article_store_grade x 
 		  join (
 		    select 
 		      hierarchy_code, 
 		      path->>'article' as article 
 		    from 
 		      (
 		        select 
 		          hierarchy_level as level 
 		        from 
 		          global.product_generic_schema_mapping 
 		        where 
 		          generic_column_name = 'article'
 		      ) x 
 		      join global.product_hierarchies_filter phf using(level)
 		      where active = true
 		  ) y using(article)
 		 join global.store_master sm using(store_code);
 	end
 $procedure$
;
