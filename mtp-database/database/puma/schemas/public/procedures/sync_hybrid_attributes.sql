--liquibase formatted sql
--changeset ashish@impactanalytics.co:sync_hybrid_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for sync_hybrid_attributes
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_hybrid_attributes();
CREATE OR REPLACE PROCEDURE public.sync_hybrid_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare 
	 _column_cnt integer;
	begin
		select 
		  count(1) into _column_cnt 
		from 
		  information_schema."columns" c 
		where 
		  table_schema = 'global' 
		  and table_name = 'product_attributes_filter' 
		  and column_name in (
			'clearance_article', 'articlestatustag'
		  );
		if _column_cnt = 2 then
			DELETE FROM 
			  "global".product_attributes pa USING "global".product_master pm 
			WHERE 
			  pa.product_code = pm.product_code 
			  and attribute_name in (
				'clearance_article', 'articlestatustag'
			  ) 
			  AND pm.is_deleted = false;

			insert into global.product_attributes (
			  product_code, attribute_name, attribute_value
			) 
			select 
			  product_code, 
			  'clearance_article' as attribute_name, 
			  coalesce(clearance_article, false) as attribute_value 
			from 
			  global.product_master pm 
			  left join (
				SELECT 
				  product_code, 
				  true as clearance_article 
				FROM 
				  inventory_smart.article_status_tag 
				where 
				  lower(article_status_tag) = 'clearance'
			  ) ast using(product_code) 
			where 
			  is_deleted = false on conflict(product_code, attribute_name) do 
			update 
			set 
			  attribute_value = excluded.attribute_value;

			insert into global.product_attributes (
			  product_code, attribute_name, attribute_value
			) 
			select 
			  product_code, 
			  'articlestatustag' as attribute_name, 
			  article_status_tag as attribute_value 
			from 
			  global.product_master pm 
			  join inventory_smart.article_status_tag ast using(product_code) 
			where 
			  is_deleted = false on conflict(product_code, attribute_name) do 
			update 
			set 
			  attribute_value = excluded.attribute_value;

			update 
			  global.product_attributes_filter paf 
			set 
			  clearance_article = x.attribute_value 
			from 
			  (
				select 
				  product_code, 
				  attribute_value::bool as attribute_value 
				from 
				  global.product_attributes 
				where 
				  attribute_name = 'clearance_article'
			  ) x 
			where 
			  paf.product_code = x.product_code;

			update 
			  global.product_attributes_filter paf 
			set 
			  articlestatustag = x.attribute_value 
			from 
			  (
				select 
				  product_code, 
				  attribute_value 
				from 
				  global.product_attributes 
				where 
				  attribute_name = 'articlestatustag'
			  ) x 
			where 
			  paf.product_code = x.product_code;
		end if;
	end
$procedure$
;
