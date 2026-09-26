#!/bin/bash -e

if [[ "${PP_TYPE}" =~ ^(validate_pr)$ ]]; then
	if [[ ! "${BITBUCKET_PR_DESTINATION_BRANCH}" =~ ^(develop/dev|develop/test|develop/uat|main)$ ]]; then
		echo -e "${RED}Not a valid target branch to compile"
		exit 1;
	fi #Compile if only target branch is dev, test, uat or prod

	if [ "${BITBUCKET_PR_DESTINATION_BRANCH}" = "develop/dev" ]; then
		export ENV=dev;
	elif [ "${BITBUCKET_PR_DESTINATION_BRANCH}" = "develop/test" ]; then
		export ENV=test;
	elif [ "${BITBUCKET_PR_DESTINATION_BRANCH}" = "develop/uat" ]; then
		export ENV=uat;
	elif [ "${BITBUCKET_PR_DESTINATION_BRANCH}" = "main" ]; then
		export ENV=prod;
	fi #Detect environment from target branch
else
    if [[ ! "${BITBUCKET_BRANCH}" =~ ^(develop/dev|develop/test|develop/uat|main)$ ]]; then
		echo -e "${RED}Not a valid branch to deploy"
		exit 1;
	fi #Compile if only source branch is dev, test, uat or prod

	if [ "${BITBUCKET_BRANCH}" = "develop/dev" ]; then
		export ENV=dev;
	elif [ "${BITBUCKET_BRANCH}" = "develop/test" ]; then
		export ENV=test;
	elif [ "${BITBUCKET_BRANCH}" = "develop/uat" ]; then
		export ENV=uat;
	elif [ "${BITBUCKET_BRANCH}" = "main" ]; then
		export ENV=prod;
	fi #Detect environment from source branch
fi

export OFFBOARD_CLIENTS="biglots calvin_klein party_city puma ralph_lauren_eu tmp vera_bradley"

echo ""
echo "🚨🚨🚨  CRITICAL WARNING: DATABASE DEPLOYMENT IN PROGRESS  🚨🚨🚨"
echo "=================================================================="
echo "⚠️  THIS ACTION WILL IMMEDIATELY TERMINATE ALL ACTIVE CONNECTIONS"
echo "⚠️  ALL RUNNING QUERIES ON THE TARGET DATABASE WILL BE FORCIBLY CLOSED"
echo "⚠️  APPLICATIONS DEPENDING ON THIS DATABASE WILL FACE DOWNTIME"
echo ""
echo "‼️  THIS MAY CAUSE TEMPORARY OUTAGE FOR PRODUCTION SERVICES"
echo "‼️  POTENTIAL DATA LOSS OR INCONSISTENCY IF NOT PLANNED CAREFULLY"
echo ""
echo "💥 IF THIS IS *NOT* AN APPROVED & PLANNED DEPLOYMENT:"
echo "❌ CANCEL THIS PIPELINE IMMEDIATELY BEFORE LIQUIBASE EXECUTES"
echo ""
echo "Proceed ONLY if you understand the risk and it’s been signed off."
echo "=================================================================="
echo -e "\n---------------------------------------- Developer Self-Service Documentation ----------------------------------------"
echo -e "Frequent Issues - https://bitbucket.org/insideinsight/mtp-database/src/documentations/frequent_issues.md"
echo -e "Pipelines Overview - https://bitbucket.org/insideinsight/mtp-database/src/documentations/pipelines_overview.md"
echo -e "Recommended Practices - https://bitbucket.org/insideinsight/mtp-database/src/documentations/recommended_practices.md"
echo -e "Precommit Hook - https://bitbucket.org/insideinsight/mtp-database/src/documentations/precommit-hook.md"
echo -e "✅ Please review each document before making DB changes or triggering deployments."
echo -e "----------------------------------------------------------------------------------------------------------------------"
echo -e "\n---------------------------------------- Pipeline Error Logs ----------------------------------------"
echo -e "Error Logs - https://groups.google.com/a/impactanalytics.co/g/mtp-db-repo-activities/"
echo -e "-------------------------------------------------------------------------------------------------------"
echo ""

export BUILD_TRIGGER_BY=`echo $(curl -s -X GET -g "https://api.bitbucket.org/2.0/users/${BITBUCKET_STEP_TRIGGERER_UUID}") | jq --raw-output .display_name`
echo "TRIGGER_BY: ${BUILD_TRIGGER_BY}"
echo ""

if [[ "${PP_TYPE}" =~ ^(custom_migration_deploy)$ ]]; then
	if [[ ! "${BUILD_TRIGGER_BY}" =~ ^(Ashish Gupta|Linu Nazil|Subhash Pophale|Ashvin Sharma|Manish Kumar|Srinivas Gowda S G|Shaik Azmathulla|Tarunreddy Challa|Hari Krishna|Krithika S|Subhasis Jena|Sonali K Trivedi|Himanshu Agarwal|Varun Sivasubramanian|Raj Mohan B|Harshalkumar Rane|MohamedRoshan k|Ramakanth Chintha|Ravichandra MS|Sumanth Reddipalli|Utkarsh Rai|Navin Chandan|Himanshu Jangra|Arjun P P|Surendra Babu|Pradeep Nayak)$ ]]; then 
		echo -e "${RED}${BUILD_TRIGGER_BY} is not authorized to deploy custom migration changes, Please contact the DB Team for assistance."
		exit 1;
	fi #Compile if only source branch is dev, test, uat or prod
fi

if [[ "${PP_TYPE}" =~ ^(maintenance)$  && "${MAINTENANCE_TYPE}" =~ ^(aggressive)$ ]]; then
	if [[ ! "${BUILD_TRIGGER_BY}" =~ ^(Ashish Gupta|Linu Nazil|Subhash Pophale|Ashvin Sharma|Manish Kumar|Srinivas Gowda S G|Shaik Azmathulla|Tarunreddy Challa|Hari Krishna)$ ]]; then 
		echo -e "${RED}${BUILD_TRIGGER_BY} is not authorized to run aggresive maintenance, Please contact the DB Team for assistance."
		exit 1;
	fi #Compile if only source branch is dev, test, uat or prod
fi

if [[ "${PP_TYPE}" =~ ^(manual_replication|replication_setup)$ ]]; then
	if [[ ! "${BUILD_TRIGGER_BY}" =~ ^(Ashish Gupta|Shaik Azmathulla)$ ]]; then 
		echo -e "${RED}${BUILD_TRIGGER_BY} is not authorized to setup replication, Please contact the DB Team for assistance. Also it's optional step can skip as well."
		#exit 1;
	fi #Compile if only source branch is dev, test, uat or prod
fi
