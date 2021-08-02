#! /bin/sh

# This script will automatically update remote dbs
# DANGER: This sould be removed when repository is made public!

DEV_URL='postgres://wvkfokfjaxiefn:672ac7f31a82f5b21042f2d427ac626964967aaea0465a270779cb493246e947@ec2-23-20-124-77.compute-1.amazonaws.com:5432/dahi226fifmcd1'
PROD_URL='postgres://zjktfwckeimmii:17e7bd6679a03d7efc3b958f223431bd0b670d69e25bd6ecf614872a077a2c34@ec2-23-20-124-77.compute-1.amazonaws.com:5432/d838rstsifstq8'

echo "\n> Updating dev..."
DATABASE_URL=$DEV_URL ./init_db.sh

echo "\n> Updating prod..."
DATABASE_URL=$PROD_URL ./init_db.sh
