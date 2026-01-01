#!/bin/bash

cd frontend-react
npm run build
cd ..
cd test
./reset_test_env.sh
cd ..
./run_react.sh
