#!/bin/bash

case "$SCRIPT_TYPE" in
  ON_BOARD)
    ./on_board.sh
    ;;
  COMPLETE_DEPLOY)
    ./complete_deploy.sh
    ;;
  MAINTENANCE)
    ./maintenance.sh
    ;;
  *)
    echo "Invalid SCRIPT_TYPE: $SCRIPT_TYPE"
    echo "Valid values: ON_BOARD, COMPLETE_DEPLOY, MAINTENANCE"
    exit 1
    ;;
esac
