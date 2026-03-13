#!/bin/bash

echo "================================================"
echo "BL602 Toolchain Installation Script"
echo "================================================"

cd $HOME

#------------------------------------------------------------------------------#
echo "[1/14] Installing system dependencies..."

sudo apt-get update
sudo apt-get install -y build-essential python3 python3-pip git screen wget xz-utils curl libssl-dev libbz2-dev ncurses-dev libffi-dev libsqlite3-dev tk-dev liblzma-dev libreadline-dev

#------------------------------------------------------------------------------#
echo "[2/14] Installing pyenv..."

curl -fsSL https://pyenv.run | bash

#------------------------------------------------------------------------------#
echo "[3/14] Configuring pyenv in bashrc..."

echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init - bash)"' >> ~/.bashrc

#------------------------------------------------------------------------------#
echo "[4/14] Cloning BL602 SDK..."

git clone --recursive https://github.com/ttefke/bl602_iot_sdk.git

cd bl602_iot_sdk

#------------------------------------------------------------------------------#
echo "[5/14] Setting up BL602 SDK environment variables..."

echo export BL60X_SDK_PATH=$(pwd) >> ~/.bashrc
echo export CONFIG_CHIP_NAME=BL602 >> ~/.bashrc

#------------------------------------------------------------------------------#
echo "[6/14] Installing RISC-V toolchain..."

mkdir -p toolchain/compiler
wget https://github.com/ttefke/riscv-gnu-toolchain/releases/download/2025.08.29/suas-gcc-15-1.tar.xz -O /tmp/toolchain.tar.xz
tar xJf /tmp/toolchain.tar.xz -C toolchain/compiler


#------------------------------------------------------------------------------#
echo "[7/14] Installing blflash tool..."

mkdir -p toolchain/bin
wget https://github.com/spacemeowx2/blflash/releases/download/v0.3.5/blflash-linux-amd64 -O toolchain/bin/blflash
chmod u+x toolchain/bin/blflash

#------------------------------------------------------------------------------#
echo "[8/14] Adding tools to PATH..."

echo export PATH="$PATH:$(pwd)/toolchain/bin" >> ~/.bashrc


#------------------------------------------------------------------------------#
echo "[9/14] Adding user to dialout group for serial access..."

sudo usermod -a -G dialout $USER

#------------------------------------------------------------------------------#
echo "[10/14] Reloading shell configuration..."

#exec "$SHELL"
 source ~/.bashrc


#------------------------------------------------------------------------------#
echo "[11/14] Installing Python 3.12 and virtual environment..."

echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo -e 'if command -v pyenv 1>/dev/null 2>&1; then\n eval "$(pyenv init -)"\nfi' >> ~/.bashrc

pyenv install 3.12
pyenv virtualenv 3.12 bl_venv

pyenv activate bl_venv

pip install --upgrade pip

#------------------------------------------------------------------------------#
echo "[12/14] Creating system-wide BL602 environment configuration..."

sudo tee /etc/profile.d/bl602.sh >/dev/null <<EOF
export BL60X_SDK_PATH=~/bl602_iot_sdk
export CONFIG_CHIP_NAME=BL602
EOF

sudo tee -a /etc/bash.bashrc >/dev/null <<EOF

# BL602 SDK Configuration
export BL60X_SDK_PATH=~/bl602_iot_sdk
export CONFIG_CHIP_NAME=BL602
EOF

#------------------------------------------------------------------------------#
echo "[13/14] Sourcing environment configuration..."
source /etc/bash.bashrc


#------------------------------------------------------------------------------#
echo "[14/14] Verifying BL602 SDK path..."
echo "BL60X_SDK_PATH is set to: $BL60X_SDK_PATH"



export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init - bash)"
eval "$(pyenv virtualenv-init -)"


source ~/.bashrc

echo "================================================"
echo " Toolchain Installation Completed Successfully"
echo "================================================"

