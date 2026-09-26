--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:audit_trigger_create runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:audit_trigger_create
--comment: initial changeset for audit_trigger_create
--rollback: SELECT 1

DROP TRIGGER IF EXISTS trigger_audit_log_control ON global.audit_log_control;
DROP FUNCTION IF EXISTS  global.audit_trigger_create();
CREATE OR REPLACE FUNCTION global.audit_trigger_create()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    call global.build_list_partitions('mtp_audit_log');
   	-- raise notice 'Trg op%',TG_OP;
    IF (TG_OP = 'INSERT') THEN
        if new.audit_enable=true then 	
        
			EXECUTE FORMAT('CREATE or replace TRIGGER trigger_%s AFTER INSERT OR UPDATE OR DELETE ON  %s FOR EACH ROW
EXECUTE FUNCTION global.audit_trigger_function()',new.table_name,new.table_schema||'.'||new.table_name);
		end if; 
   
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN 
    	if new.audit_enable=true then 	
			EXECUTE FORMAT('CREATE or replace TRIGGER trigger_%s AFTER INSERT OR UPDATE OR DELETE ON  %s FOR EACH ROW
EXECUTE FUNCTION global.audit_trigger_function()',new.table_name,new.table_schema||'.'||new.table_name);
		elsif new.audit_enable =false or new.audit_enable is null then
			
            EXECUTE FORMAT('DROP TRIGGER if exists trigger_%s on %s',new.table_name,new.table_schema||'.'||new.table_name);
		--	raise notice 'drop%',FORMAT('DROP TRIGGER if exists trigger_%s on %s ',new.table_name,new.table_schema||'.'||new.table_name);
		end if; 
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
       		--raise notice 'drop%',FORMAT('DROP TRIGGER if exists trigger_%s on %s ',old.table_name,old.table_schema||'.'||new.table_name);
			
       		EXECUTE FORMAT('DROP TRIGGER if exists trigger_%s on %s ',old.table_name,old.table_schema||'.'||old.table_name);
			
		RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$
;


create or replace trigger trigger_audit_log_control after
insert or delete or update on global.audit_log_control for each row execute function global.audit_trigger_create();
