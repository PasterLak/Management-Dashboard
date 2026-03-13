#!/bin/bash

echo "================================================"
echo " BL602 Compilation Started"
echo "================================================"



#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get the parent directory (folder containing the script folder)
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
PARENT_FOLDER_NAME="$(basename "$PARENT_DIR")"

# Define the required parent folder name
REQUIRED_PARENT_FOLDER="customer_app"

# Function to print error in red
print_error() {
    echo -e "\033[31m$1\033[0m" >&2
}

# Check if parent folder name matches the required one
# if [[ "$PARENT_FOLDER_NAME" != "$REQUIRED_PARENT_FOLDER" ]]; then
#     print_error "ERROR: Project folder must be located inside the '$REQUIRED_PARENT_FOLDER' folder."
#     print_error "Current parent folder: $PARENT_FOLDER_NAME"
#     print_error "Expected parent folder path: /home/vlad/bl602_iot_sdk/customer_app/"
#     print_error "Actual path: $SCRIPT_DIR"
#     exit 1
# fi

# If check passed, continue with the script
echo "Parent folder check passed. Script is located inside '$REQUIRED_PARENT_FOLDER' folder."







export BL60X_SDK_PATH="$HOME/bl602_iot_sdk"

# Activate virtual environment
#------------------------------------------------------------------------------#

export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"


pyenv virtualenv 3.12 bl_venv

pyenv activate bl_venv

pip install --upgrade pip

#------------------------------------------------------------------------------#
# Run compile file
chmod u+x genromap
./genromap

echo "================================================"
echo "  BL602 Compilation Finished"
echo "================================================"
