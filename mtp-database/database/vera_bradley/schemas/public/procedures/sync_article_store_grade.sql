--liquibase formatted sql
--changeset laraib.ahmad:sync_article_store_grade runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  updated sync_article_store_grade removing article with ast as old added on conflict
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_store_grade();
CREATE OR REPLACE PROCEDURE public.sync_article_store_grade()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
--		delete from 
--		  inventory_smart.article_store_grade 
--		where 
--		  true;
		INSERT INTO inventory_smart.article_store_grade (
		  article, store_code, grade, ph_code
		) 
		SELECT 
		  article, 
		  x.store_code, 
		  grade, 
		  hierarchy_code as ph_code 
		FROM 
		  public.article_store_grade_delta x 
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
		 join global.store_master sm using(store_code)
		where change_type = 0
		on conflict(store_code,ph_code) 
		  do 
			update 
			set 
			  grade = excluded.grade;
		update inventory_smart.article_store_grade asg set grade = x.grade from 
	(select article,store_code,grade from  public.article_store_grade_delta
	where change_type = 1) x 
	where asg.store_code =x.store_code
	and asg.article = x.article;
	end
$procedure$
;
