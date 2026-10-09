#!/bin/bash

PROJECT_DIR="/home/rai/Projects/HOPNet"

ptyxis --new-window -- bash -c "'$PROJECT_DIR/run-frontend.sh'; exec bash" &
ptyxis --new-window -- bash -c "'$PROJECT_DIR/run-backend.sh'; exec bash" &
