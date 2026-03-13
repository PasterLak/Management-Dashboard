#!/bin/bash

echo "================================================"
echo "BL602 Toolchain Uninstallation Script"
echo "================================================"

cd $HOME

echo "Removing BL602 SDK..."
rm -rf ~/bl602_iot_sdk

echo "Removing pyenv..."
rm -rf ~/.pyenv

echo "Removing pyenv lines from ~/.bashrc..."
sed -i '/PYENV_ROOT/d' ~/.bashrc
sed -i '/pyenv init/d' ~/.bashrc
sed -i '/pyenv virtualenv-init/d' ~/.bashrc

echo "Removing BL602 environment variables from ~/.bashrc..."
sed -i '/BL60X_SDK_PATH/d' ~/.bashrc
sed -i '/CONFIG_CHIP_NAME/d' ~/.bashrc
sed -i '/toolchain\/bin/d' ~/.bashrc

echo "Removing BL602 configuration from /etc/profile.d..."
sudo rm -f /etc/profile.d/bl602.sh

echo "Removing BL602 configuration from /etc/bash.bashrc..."
sudo sed -i '/BL602 SDK Configuration/,+2d' /etc/bash.bashrc

echo "Removing downloaded toolchain..."
sudo rm -rf /tmp/toolchain.tar.xz

echo "Removing BL602 virtual environment..."
if command -v pyenv >/dev/null 2>&1; then
  eval "$(pyenv init -)"
  pyenv virtualenv-delete -f bl_venv || true
fi

echo "Removing user from dialout group..."
sudo gpasswd -d $USER dialout || true

echo "Reloading shell configuration..."
exec "$SHELL"

echo "================================================"
echo "BL602 Toolchain Uninstallation Completed"
echo "================================================"

