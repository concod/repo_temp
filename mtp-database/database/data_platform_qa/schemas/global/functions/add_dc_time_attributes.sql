--liquibase formatted sql
--changeset akshay.jain:add_dc_time_attributes1 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-57260
--comment: MTP-57260 added update by and at info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_dc_time_attributes(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_dc_time_attributes(input jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 	begin
 		delete from 
 		  "global".store_time_attributes 
 		where 
 		  store_code in (
 		    select 
 		      sm.store_code 
 		    from 
 		      (
 		        select 
 		          unnest(dc_codes) as dc_code 
 		        from 
 		          (
 		            select 
 		              replace(
 		                replace(value, '[', '{'), 
 		                ']', 
 		                '}'
 		              ):: int[] as dc_codes 
 		            from 
 		              jsonb_each_text($1) 
 		            where 
 		              key = 'dc_codes'
 		          ) dc
 		      ) dc 
 		      join "global".store_master sm on dc.dc_code = sm.dc_code
 		  );
 		insert into "global".store_time_attributes (
 		  store_code, attribute_name, attribute_value, 
 		  start_time, end_time, updated_by, updated_at
 		) 
 		select 
 		  store_code, 
 		  attribute_name, 
 		  attribute_value, 
 		  start_date::date as start_time, 
 		  end_date::date as end_time,
 		  $2 as updated_by,
 		  now() as updated_at
 		from 
 		  (
 		    select 
 		      sm.store_code 
 		    from 
 		      (
 		        select 
 		          unnest(dc_codes) as dc_code 
 		        from 
 		          (
 		            select 
 		              replace(
 		                replace(value, '[', '{'), 
 		                ']', 
 		                '}'
 		              ):: int[] as dc_codes 
 		            from 
 		              jsonb_each_text($1) 
 		            where 
 		              key = 'dc_codes'
 		          ) dc
 		      ) dc 
 		      join "global".store_master sm on dc.dc_code = sm.dc_code
 		  ) sm 
 		  join (
 		    select 
 		      json_array_elements(value :: json)->> 'attribute_name' as attribute_name, 
 		      json_array_elements(value :: json)->> 'attribute_value' as attribute_value, 
 		      json_array_elements(value :: json)->> 'start_date' as start_date, 
 		      json_array_elements(value :: json)->> 'end_date' as end_date
 		    from 
 		      jsonb_each_text($1) 
 		    where 
 		      key = 'attributes'
 		  ) attr on true;
 with CTE as (
 	select
 		  store_code,
 	 	  dc_code,
 		  attribute_name,
 		  attribute_value,
 		  start_date::date as start_time,
 		  end_date::date as end_time
 		from
 		  (
 		    select
 		      sm.store_code,
 			  sm.dc_code
 		    from
 		      (
 		        select
 		          unnest(dc_codes) as dc_code
 		        from
 		          (
 		            select
 		              replace(
 		                replace(value, '[', '{'),
 		                ']',
 		                '}'
 		              ):: int[] as dc_codes
 		            from
 		              jsonb_each_text($1)
 		            where
 		              key = 'dc_codes'
 		          ) dc
 		      ) dc
 		      join "global".store_master sm on dc.dc_code = sm.dc_code
 		  ) sm
 		  join (
 		    select
 		      json_array_elements(value :: json)->> 'attribute_name' as attribute_name,
 		      json_array_elements(value :: json)->> 'attribute_value' as attribute_value,
 		      json_array_elements(value :: json)->> 'start_date' as start_date,
 		      json_array_elements(value :: json)->> 'end_date' as end_date
 		    from
 		      jsonb_each_text($1)
 		    where
 		      key = 'attributes'
 		  ) attr on true)
 update
 	"global".distribution_centres b
 set
 	is_active = case when a.attribute_value = 'Renovation' then true
 				     when a.attribute_value = 'Deactivated' then true
 				     when a.attribute_value = 'close' then false
 				     when a.attribute_value = 'open' then true
 				     when a.attribute_value = 'active' then true
 				     else b.is_active
 				     end
 from
 	CTE a
  	where a.dc_code = b.dc_code
  	;
 	end
 $function$
;
