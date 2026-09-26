--liquibase formatted sql
--changeset chaitanyaprasad.reddy:MTP-29880_MTP_29883_create_user_permissions runOnChange:true stripComments:false splitStatements:false context:MTP-15676 labels:MTP-29880_MTP_29883_create_user_permissions
--comment: Added updated_at, updated_by details to the table for logging
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_user_permissions(input jsonb);
CREATE OR REPLACE FUNCTION global.create_user_permissions(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

/*
 * Function/Procedure name: global.create_user_permissions
 * Created by: Kailash Yadav
 * Created at: 15-Dec-2021
 * No of input parameter: 1
 * Parameter Description : $1 = JSON User access assign
 * Purpose: This function  is use to assign the permission to given user for a given application, role, screen and category
 * Calling Statement:
select
	*
from
	global.create_user_permissions ('{"users_id": [111,112,312],
									  "attributes": [{"application": ["assort","plan"],
												     "role" : "bmp",
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
 * Chaitanya 		27-Apr-2023:    Added a new feature to add default applications to the user 
 * Chaitanya		19-May-2023:    Restricted the user from having multiple roles in an application
 * Chaitanya        06-Dec-2023:    Added updated_at, updated_by details to the table for logging	   
 */

 declare
 
 	_key_role text[] ;
 	_key_app text[] ;
 	_key_ah text ;
 
 	_val_role text[] ;
 	_val_app text[] ;
 	_val_default_apps text[];
 
 
 
 	_key text;
 	_val text;
 	_key1 text;
 	_val1 json;
 
 	_key2 text;
 	_val2 text;
 	_val3 text;
 
 	_app_id text;
 	_counter integer:=0;
 	_default_app_id text;
 	_default_counter integer := 0;
 
 	_user_id text;
 	_access_hierarchy text ;
 	_filters text;
 
    _attribute_a json;
 
    _query_input text;
    _user_id_array text[];
 
    _am_query text;
    _default_am_query text;
    _rm_query text;
    _acl_query text;
    _delete_uam text;
	_insert_uahm text;
    _select_uahm text;
    _delete_uahm text;
 
    _role_code text;
    _default_acl_query text;
    _insert_default_uahm text;
    _default_record_exisits_query text;
   	_delete_acl_query text;
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
 							  _key_role := array_append (_key_role,_key2);
 							 -- _val_role := array_append (_val_role, _val2);
 							  _role_code :=  _val2;
 
 							  raise notice '_role_code%',_role_code::text;
 
 							elsif _key2 ='application' then
 							  _key_app := array_append (_key_app, _key2);
 							  _val_app := array_append (_val_app, _val2);
 
 							elsif _key2 ='access_hierarchy' then
 							 _access_hierarchy :=  _val2 ;
 							elsif _key2 ='filters' then
 								_filters := _val2;
 							elsif _key2 = 'default_applications' then
 								_default_counter := cardinality(ARRAY(SELECT json_array_elements_text(_val2::json)));
 								_val_default_apps := array_append (_val_default_apps, _val2);
 								
 
 
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
 		_default_app_id :=   lower(replace(replace (replace (unnest (_val_default_apps) ,'"','''' ),'[', '('),']', ')'));
 	
 		_user_id := replace (replace (replace (replace (replace (_user_id_array::text,'{','('),'}',')'), '"',''),'[', ''),']', '');
 
 		--_role_code:=  replace (replace (_val_role::text,'{',''),'}','')  ;
 
 		
 		
 
 
 		_am_query := 'select application_code from global.application_master am where status and lower(name) in '||_app_id;
 	
 		_default_am_query := 'select application_code from global.application_master am where status and lower(name) in '|| _default_app_id;
 		--_rm_query := 'select role_code from global.roles_master rm where name in '|| replace (replace (_role_code::text,'{','('''),'}',''')');
 		_rm_query := 'select role_code from global.roles_master rm where name = '''||_role_code||'''';
 		
 		
 
 
 	   _acl_query:= 'select am.acl_code  from global.acl_master am
 	   								where 1=1
 							          and am.role_code in ('||_rm_query||')'||'
 	                                  and am.application_code in ('||_am_query||')';
 	                                 
 	    _default_acl_query := 'select am.acl_code  from global.acl_master am
 	   								where 1=1
 							          and am.role_code in ('||_rm_query||')'||'
 	                                  and am.application_code in ('||_default_am_query||')';
 	     
 	    _default_record_exisits_query = ' SELECT 1 FROM "global".user_access_hierarchy_mapping uahm
  WHERE user_code = um.user_code and acl_code in (select acl_code from "global".acl_master am where am.application_code = x.application_code )';
 	    
        
 		_delete_acl_query := 'select am.acl_code from global.acl_master am where 1=1 and am.application_code in ('||_am_query||')';
 
 
 
        _delete_uam :=  'delete  from global.user_access_hierarchy_mapping
 				where user_code   in '||_user_id||'
 				and   acl_code in ( '||_delete_acl_query||' ) ' ;
 
 
 
 		_insert_uahm := 'insert into global.user_access_hierarchy_mapping (acl_code,user_code,access_hierarchy,filters, updated_at, updated_by)
 				(select acl_code, um.user_code, access_hierarchy::jsonb, filters::jsonb, updated_at, updated_by from (
 					select acl_code,'''|| _access_hierarchy ||'''::jsonb as access_hierarchy, '''||_filters||'''::jsonb as filters, now() as updated_at ,' || _updated_by || ' as updated_by from global.acl_master am where  acl_code in ('||_acl_query||')) x
 				join (select user_code from global.user_master um where user_code in '||_user_id||' )  um on 1=1
 						 )';
 		
 		_insert_default_uahm := 'insert into global.user_access_hierarchy_mapping (acl_code,user_code,access_hierarchy,filters, updated_at, updated_by )
 				(select acl_code, um.user_code, access_hierarchy::jsonb, filters::jsonb, updated_at, updated_by from (
 					select acl_code,application_code,'''|| _access_hierarchy ||'''::jsonb as access_hierarchy, '''||_filters||'''::jsonb as filters, now() as updated_at, ' || _updated_by || ' as updated_by from global.acl_master am where  acl_code in ('||_default_acl_query||')) x
 				join (select user_code from global.user_master um where user_code in '||_user_id||' )  um on 1=1
 						 WHERE NOT EXISTS (' || _default_record_exisits_query || '))';
 						
 		raise notice '_delete_uam%'	,	_delete_uam;
 		raise notice '_insert_uahm%'	,	_insert_uahm;
 		raise notice '_insert_default_uahm % ', _insert_default_uahm;
 
 		execute  _delete_uam;
 		execute  _insert_uahm;
 		
 		if _default_counter > 0 then
 	    	execute _insert_default_uahm;
 	    end if;
 
 	end $function$
;