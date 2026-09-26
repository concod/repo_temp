# DB Migration & Version Control

Pipeline to calculate differences between initial.sql and latest commits in same branch folder structure.

### Prerequisites

What things you need to install the software and how to install them

```
Python 3.8.3
Pip 19.2.3 or updated
PG DUMP at same verion as your database want to migrate
```

### Installing

A step by step series of examples that tell you how to get a development env running

```
python3.8 -m venv env
source ./env/bin/activate
pip3.8 install -r requirements.txt
```

## DB Migration SOP


### Sample .env

```

#Postgres Credentials source
DB_HOST=0.0.0.0
DB_PORT=5432
DB_NAME=source_db
DB_USER=postgres
DB_PASSWORD=xxx-xxx-xxx-xxx

#Postgres Credentials destination
DB_HOST_LOCAL=0.0.0.0
DB_PORT_LOCAL=5432
DB_NAME_LOCAL=destination_db
DB_USER_LOCAL=postgres
DB_PASSWORD_LOCAL=xxx-xxx-xxx-xxx

SCHEMAS=global,assort,ada,historical,ingest,plan_smart

```

After making changes in .env now we are ready to deploy generic schema on postgresql

```
python3.8 restore.py
```

## Process

### Step 1

#### Restore Initial Script
It will pick initial.sql and restore to source_db

### Step 2

#### Scan & Compile
It will scan all schemas folder in order define in env and restore to destination_db
Custom Type -> Tables -> Views -> Methods -> Triggers

### Step 3

#### Restore Changes
Once all scripts compiled and fit to destination it will dump destination as initial.sql and schema/schema.sql as well

### Step 4

#### Compare & Get Migration Script
Step 3 and 4 can swap it's position. This step will calculate schema changes and generate migration.sql


## Directory Tree

```
.
├── README.md
├── schema_name
│   ├── types
│   │   └── types_name.sql
│   ├── functions
│   │   └── function_name.sql
│   ├── materialized_views
│   │   └── materialize_view_name.sql
│   ├── views
│   │   └── view_name.sql
│   ├── procedures
│   │   └── procedures_name.sql
│   ├── triggers
│   │   └── trigger_name.sql
│   ├── schema_name.sql
│   └── tables
│       └── table_name.sql
├── initial_data
│   └── global
│       ├── inventory_generic_schema_mapping.csv
│       ├── product_generic_schema_mapping.csv
│       ├── store_generic_schema_mapping.csv
│       └── transaction_generic_schema_mapping.csv
├── dml_scripts.sql
├── initial.sql
├── migration.sql
├── requirements.txt
└── restore.py
```

## Authors

* **Ashish Gupta** - *Initial work*
