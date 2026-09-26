--liquibase formatted sql
--changeset liquibase:sync_article_status_tag runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_article_status_tag
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_status_tag();
CREATE OR REPLACE PROCEDURE public.sync_article_status_tag()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  inventory_smart.article_status_tag 
		where 
		  true;
		INSERT INTO inventory_smart.article_status_tag (
		  product_code, channel, article_status_tag, 
		  "size", new_size, "order"
		) 
		SELECT 
		distinct 
		  product_code, 
		  channel, 
		  article_status_tag, 
		  "size", 
		  new_size, 
		  size_order 
		FROM 
		  public.article_status_tag x 
		  join global.product_master pm using(product_code)
		   where not exists (select 'p' from inventory_smart.article_status_tag b
		 where x.product_code=b.product_code and x.channel=b.channel   
		 )
		 ;
	end
$procedure$
;
