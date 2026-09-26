--liquibase formatted sql
--changeset liquibase:tg_fn_generate_audit_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tg_fn_generate_audit_1
--rollback: SELECT 1
DROP FUNCTION if exists um.tg_fn_generate_audit();
CREATE FUNCTION um.tg_fn_generate_audit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$

BEGIN
   Declare message_info text := '';
   uuid_new uuid :=  OLD.uuid;
   vl_column_names text := '';
   BEGIN
      select array_to_string(array_agg(column_name::TEXT),',') into vl_column_names  from information_schema.columns where table_name=''|| TG_TABLE_NAME ||'' and table_schema = ''||TG_TABLE_SCHEMA||'';
      message_info := 'INSERT INTO audittrail.hs_' || TG_TABLE_NAME || ' (' || vl_column_names||') select  ' || vl_column_names||'  from '|| TG_TABLE_NAME ||' where uuid = '''|| uuid_new ||'''';
      begin 
       execute message_info  ;
      exception when others then
        insert into audittrail.tb_debug_info (message_info,error_message, uuid) values (vl_column_names,SQLERRM,uuid_new);
      end;
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSIF TG_OP = 'UPDATE' THEN  
        RETURN NEW;
      end if;
   END;
END;

$function$
;
