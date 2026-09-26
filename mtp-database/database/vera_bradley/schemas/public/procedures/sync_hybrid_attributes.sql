--liquibase formatted sql
--changeset laraib.ahmad@impactanalytics.co:sync_hybrid_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-24386
--comment: Added null condition for product direct chennel 
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
		  AND column_name IN ('product_direct_channel',
          'full_articlestatustag','factory_articlestatustag'
         );
		if _column_cnt = 3 then
			DELETE FROM 
			  "global".product_attributes pa USING "global".product_master pm 
			WHERE 
			  pa.product_code = pm.product_code 
			  and attribute_name in ('product_direct_channel','full_articlestatustag','factory_articlestatustag')
			  AND pm.is_deleted = false;
			insert into global.product_attributes (
			  product_code, attribute_name, attribute_value
			)
			select 
			  product_code, 
			  'product_direct_channel' as attribute_name, 
			  product_direct_channel as attribute_value 
			from 
			  global.product_master pm 
			  join (
				SELECT 
				  product_code, 
				  case 
						when (channel like '%Factory%' and channel like '%Full%') then 'Factory & Full Line'
						when (channel like '%Full%') then 'Full Line Exclusive'
						when (channel like '%Factory%') then 'Factory Exclusive'
					end as product_direct_channel
				FROM 
				  public.product_direct_channel
			  ) pc using(product_code) 
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
			  'full_articlestatustag' as attribute_name, 
			  article_status_tag as attribute_value 
			from 
			  global.product_master pm 
			  join inventory_smart.article_status_tag ast
			  
			  using(product_code) 
			where 
			  is_deleted = false  and channel ='Full Line Retail' on conflict(product_code, attribute_name) do 
			update 
			set 
			  attribute_value = excluded.attribute_value;
			insert into global.product_attributes (
			  product_code, attribute_name, attribute_value
			) 
			select 
			  product_code, 
			  'factory_articlestatustag' as attribute_name, 
			  article_status_tag as attribute_value 
			from 
			  global.product_master pm 
			  join inventory_smart.article_status_tag ast
			  
			  using(product_code) 
			where 
			  is_deleted = false  and channel ='Factory Line Retail' on conflict(product_code, attribute_name) do 
			update 
			set 
			  attribute_value = excluded.attribute_value;
			 
			update 
			  global.product_attributes_filter paf 
			set 
			  product_direct_channel = x.attribute_value 
			from 
			  (
				select 
				  product_code, 
				  attribute_value 
				from 
				  global.product_attributes 
				where 
				  attribute_name = 'product_direct_channel'
			  ) x 
			where 
			  paf.product_code = x.product_code;
			update 
			  global.product_attributes_filter paf 
			set 
			  full_articlestatustag = x.attribute_value 
			from 
			  (
				select 
				  product_code, 
				  attribute_value 
				from 
				  global.product_attributes 
				where 
				  attribute_name = 'full_articlestatustag'
			  ) x 
			where 
			  paf.product_code = x.product_code;
			 update 
			  global.product_attributes_filter paf 
			set 
			  factory_articlestatustag = x.attribute_value 
			from 
			  (
				select 
				  product_code, 
				  attribute_value 
				from 
				  global.product_attributes 
				where 
				  attribute_name = 'factory_articlestatustag'
			  ) x 
			where 
			  paf.product_code = x.product_code;
			 update 
			  global.product_attributes_filter paf 
			set 
			  factory_articlestatustag = null  
			  where factory_articlestatustag='articlestatustag';
			 update 
			  global.product_attributes_filter paf 
			set 
			  full_articlestatustag = null  
			  where full_articlestatustag='articlestatustag';
			  update 
			  global.product_attributes_filter paf 
			set 
			  product_direct_channel = null  
			  where product_direct_channel='Indirect';


		end if;
	end
$procedure$
;
