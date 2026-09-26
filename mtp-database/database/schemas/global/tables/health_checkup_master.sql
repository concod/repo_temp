--liquibase formatted sql
--changeset shaik.azmathulla :health_checkup_master stripComments:false splitStatements:false context:Db_health_checkup labels:Db_health_checkup
--comment: storing the health check up rules

CREATE TABLE IF NOT EXISTS global.health_checkup_master 
(
	health_checkup_id serial primary key,
	catagory_code varchar not null ,
	catagory_name varchar not null ,
	is_active bool NOT NULL DEFAULT true,
	last_run_status varchar(1) NULL,
	last_run_date date NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_by varchar NULL,
	thresh_hold INT NULL,
	UNIQUE(catagory_code, catagory_name)
);

-- P processing , S-successful ,F-failed
ALTER TABLE  global.health_checkup_master 
ADD CONSTRAINT health_checkup_master_status_check CHECK (last_run_status = 'P' OR last_run_status = 'S' OR last_run_status = 'F'); 

UPDATE global.health_checkup_master
SET catagory_code = 'TWSS' 
WHERE catagory_code = 'TWBS' AND catagory_name = 'Tables with bad statistics' ;

INSERT INTO global.health_checkup_master (catagory_code,catagory_name,thresh_hold,is_active)
SELECT * 
FROM 
(
SELECT 'TBE' AS catagory_code,'Table bloat estimation' AS catagory_name,30 AS thresh_hold ,true AS is_active --30%
UNION ALL
SELECT 'UI','Unused indexes',null,false
UNION ALL
SELECT 'II','Invalid indexes',null,false
UNION ALL
SELECT'VNT','Vacuum Needed Tables',30,true --30%
UNION ALL
SELECT'TWSS','Tables with stale statistics',null,true
UNION ALL
SELECT'TS','Tables size',15,true -- 15gb
UNION ALL
SELECT'LI','Large indexes',1,false -- 1gb
UNION ALL
SELECT'PS','Partition Size',2,true -- 2gb
UNION ALL
SELECT'CAS','Current Autovacuum Status',null,false
UNION ALL
SELECT 'TWOI','Tables Without Index',2,true -- 2gb
UNION ALL
SELECT 'CPU-IQ','CPU-intensive queries',null,true
UNION ALL
SELECT 'IO-WQ','I/O-waiting queries',null,true
UNION ALL
SELECT 'IO-BD','I/O-bottleneck detection',null,true
UNION ALL
SELECT 'PLTA','Partitions larger than average',1,true --1gb
)a
WHERE NOT EXISTS (SELECT 1 FROM global.health_checkup_master b WHERE a.catagory_code = b.catagory_code and a.catagory_name = b.catagory_name)
;
--changeset shaik.azmathulla :health_checkup_master_1 stripComments:false splitStatements:false context:Db_health_checkup labels:Db_health_checkup
--comment: storing the health check up rules
UPDATE global.health_checkup_master
SET catagory_code = 'TWSS' 
WHERE catagory_code = 'TWBS';


--changeset shaik.azmathulla :health_checkup_master_2 stripComments:false splitStatements:false context:Db_health_checkup labels:Db_health_checkup_2
--comment: storing the health check up rules
INSERT INTO global.health_checkup_master (catagory_code,catagory_name,thresh_hold,is_active)
SELECT * 
FROM 
(
SELECT 'SRN' AS catagory_code,'Serial Report' AS catagory_name,60 AS thresh_hold ,true AS is_active --60%
union all
SELECT 'IGR' AS catagory_code,'Individual Generic Role' AS catagory_name,null AS thresh_hold ,true AS is_active 
)a
WHERE NOT EXISTS (SELECT 1 FROM global.health_checkup_master b WHERE a.catagory_code = b.catagory_code and a.catagory_name = b.catagory_name)
;