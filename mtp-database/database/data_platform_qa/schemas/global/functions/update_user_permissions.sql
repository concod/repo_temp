--liquibase formatted sql
--changeset chaitanyaprasad.reddy:MTP-29880_MTP_29883_update_user_permissions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels: MTP-29880_MTP_29883_update_user_permissions
--comment: Added updated_at, updated_by details to the table for logging for updated access SP
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_user_permissions(input jsonb);
CREATE OR REPLACE FUNCTION global.update_user_permissions(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

/*

 * Function/Procedure name: global.update_user_permissions
 * Created by: Kailash Yadav
 * Created at: 15-Dec-2021
 * No of input parameter: 1
 * Parameter Description : $1 = JSON User access update
 * Purpose: This function  is use to update the permission to given user for a given application, role, screen and category
 * Calling Statement:
select
	*
from
	global.update_user_permissions ('{"users_id": [111,1233],
									  "attributes": [{"application": ["assort","plan"],
												     "role" : "bmp",
												     "hierarchy_id : 1 ,
													  "access_hierarchy": [
										                {
										                    "category": "c1",
										                    "channel": "B&M",
										                    "department": "apparels"
										                },
										                {
										                    "category": "c1",
										                    "channel": "ecom",
										                    "department": "clothing"
										                }
										           		]
													 }
													]
									}')
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    14-Mar-2021:    To resolve the user assign issue due to application name case, converted from upper to lower.
 * Chaitanya        06-Dec-2023:    Added updated_at, updated_by details to the table for logging	

Calling Statement:
*/
	declare

	_val_hierarchy_id text;
	_hierarchy_id text;
	_val_role text[] ;
	_val_app text[] ;
	_val_ah text ;

	_key text;
	_val text;

	_val1 json;

	_key2 text;
	_val2 text;


	_app_id text;
	_user_id text;
	_filters text;

	_access_hierarchy text:='';

   	_attribute_a json;

   	_user_id_array text[];

   	_am_query text;
    _rm_query text;

   	_insert_uahm text;
    _delete_uahm text;

   	_role_code text;
  	_acl_query text;

  	_counter int:=0;
    test_query text;
   	_updated_by integer;

	begin
		for _key,_val in (select key, value from jsonb_each_text ($1::jsonb))
		loop
			if _key ='users_id' then
				_user_id_array := array_append(_user_id_array, _val);
			elsif _key = 'updated_by' then
 				_updated_by := _val;
			elsif _key ='attributes' then
				_attribute_a :=_val;
				raise notice '%',_attribute_a;
					for _val1 in (select value from json_array_elements (_attribute_a::json))
						loop
							for _key2,_val2 in (select key, value from json_each_text(_val1::json))
							loop

							if _key2 ='role' then

							  _val_role := array_append (_val_role, _val2);
							 _role_code :=  _val2;



							elsif _key2 ='application' then

							  _val_app := array_append (_val_app, _val2);

							elsif _key2 ='access_hierarchy' then

							  _access_hierarchy :=  _val2 ;



							elsif _key2 ='hierarchy_id' then

							  _val_hierarchy_id :=  _val2 ;
							 
							 elsif _key2 ='filters' then
								_filters := _val2;



							/*elsif  _key2 ='action' then
							  _key_action := array_append (_key_action,_key2);
							  _val_action := array_append (_val_action, _val2);

							elsif _key2 ='screen' then
							  _key_screen := array_append (_key_screen, _key2);
							  _val_screen := array_append (_val_screen, _val2);
							 -- raise notice '%',_val_screen;
							*/
							end if;
						  end loop;
						end loop;
			end if;

		end loop;

	for _app_id,_counter in select unnest (_val_app) loop
		 _counter :=_counter+1;
			if _counter> 1 then
			_app_id:= _app_id||_app_id||',';
			end if;
		end loop;

 	_app_id :=   lower(replace(replace (replace ( _app_id ,'"','''' ),'[', '('),']', ')'));



	_user_id := replace (replace (replace (replace (replace (_user_id_array::text,'{','('),'}',')'), '"',''),'[', ''),']', '');

	--_role_code:= lower(replace (replace (_val_role::text,'{',''),'}',''))  ;


	_am_query := 'select application_code from global.application_master am where lower(name) in '||_app_id;
	_rm_query := 'select role_code from global.roles_master rm where name = '''||_role_code||'''';



	   _acl_query:= 'select am.acl_code  from global.acl_master am
	   								where 1=1
							          and am.role_code in ('||_rm_query||')'||'
	                                  and am.application_code in ('||_am_query||')';



       _delete_uahm :=  'delete  from global.user_access_hierarchy_mapping
				where hierarchy_id::text in (select  jsonb_array_elements_text('''||_val_hierarchy_id||'''))';



		_insert_uahm := 'insert into global.user_access_hierarchy_mapping (acl_code,user_code,access_hierarchy,filters, updated_at, updated_by )
				(select acl_code, um.user_code, access_hierarchy::jsonb, filters::jsonb, updated_at, updated_by from (
					select acl_code,'''|| _access_hierarchy ||'''::jsonb as access_hierarchy, '''||_filters||'''::jsonb as filters, now() as updated_at ,' || _updated_by || ' as updated_by from global.acl_master am where  acl_code in ('||_acl_query||')) x
				join (select user_code from global.user_master um where user_code in '||_user_id||' )  um on 1=1
						 )';

	raise notice '_insert_uahm%',_insert_uahm;
	raise notice '_delete_uahm%',_delete_uahm;



      execute _delete_uahm;
	  execute _insert_uahm;


	exception when others then
	 raise notice '%',sqlerrm;
	end $function$
;
