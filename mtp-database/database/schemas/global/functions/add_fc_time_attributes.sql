--liquibase formatted sql
--changeset liquibase:add_fc_time_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_fc_time_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_fc_time_attributes(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_fc_time_attributes(input jsonb, integer)
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
		          unnest(fc_codes) as fc_code 
		        from 
		          (
		            select 
		              replace(
		                replace(value, '[', '{'), 
		                ']', 
		                '}'
		              ):: int[] as fc_codes 
		            from 
		              jsonb_each_text($1) 
		            where 
		              key = 'fc_codes'
		          ) fc
		      ) fc 
		      join "global".store_master sm on fc.fc_code = sm.fc_code
		  );
		insert into "global".store_time_attributes (
		  store_code, attribute_name, attribute_value, 
		  start_time, end_time
		) 
		select 
		  store_code, 
		  attribute_name, 
		  attribute_value, 
		  start_date::date as start_time, 
		  end_date::date as end_time 
		from 
		  (
		    select 
		      sm.store_code 
		    from 
		      (
		        select 
		          unnest(fc_codes) as fc_code 
		        from 
		          (
		            select 
		              replace(
		                replace(value, '[', '{'), 
		                ']', 
		                '}'
		              ):: int[] as fc_codes 
		            from 
		              jsonb_each_text($1) 
		            where 
		              key = 'fc_codes'
		          ) fc
		      ) fc 
		      join "global".store_master sm on fc.fc_code = sm.fc_code
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
		  fc_code,
		  attribute_name,
		  attribute_value,
		  start_date::date as start_time,
		  end_date::date as end_time
		from
		  (
		    select
		      sm.store_code,
			  sm.fc_code
		    from
		      (
		        select
		          unnest(fc_codes) as fc_code
		        from
		          (
		            select
		              replace(
		                replace(value, '[', '{'),
		                ']',
		                '}'
		              ):: int[] as fc_codes
		            from
		              jsonb_each_text($1)
		            where
		              key = 'fc_codes'
		          ) fc
		      ) fc
		      join "global".store_master sm on fc.fc_code = sm.fc_code
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
	"global".fulfilment_centres b
set
	is_active = case when a.attribute_value = 'Renovation' then true
				     when a.attribute_value = 'Deactivated' then true
				     when a.attribute_value = 'close' then false
				     when a.attribute_value = 'open' then true
				     end,
	is_deleted = case when a.attribute_value = 'Renovation' then false
					  when a.attribute_value = 'Deactivated' then false
					  when a.attribute_value='close' then true
					  when a.attribute_value = 'open' then false
					  end
from
	CTE a
 	where a.fc_code = b.fc_code
 	;
	end
$function$
;
