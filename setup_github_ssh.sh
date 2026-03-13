#!/bin/bash


echo "================================================"
echo "  Welcome to GitHub SSH Setup Wizard"
echo "================================================"

echo "🔑 Checking for existing SSH keys..."
if [ -f ~/.ssh/id_ed25519.pub ]; then
    echo "✅ SSH key already exists: ~/.ssh/id_ed25519.pub"
else
    echo "⚙️  Creating a new SSH key..."
    read -p "Enter your GitHub email: " email
    ssh-keygen -t ed25519 -C "$email" -f ~/.ssh/id_ed25519 -N ""
fi

echo "🚀 Starting ssh-agent..."
eval "$(ssh-agent -s)" >/dev/null

echo "➕ Adding key to agent..."
ssh-add ~/.ssh/id_ed25519

echo "📋 Your public SSH key is:"
echo "----------------------------------------"
cat ~/.ssh/id_ed25519.pub
echo "----------------------------------------"
echo " Copy this key and add it to your GitHub:"
echo "   https://github.com/settings/keys"
echo
read -p "Press ENTER after you’ve added the key to GitHub..."

echo "🔍 Testing connection to GitHub..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo "✅ SSH connection successful!"
else
    echo "❌ SSH connection failed. Check if key was added correctly."
    exit 1
fi



echo "================================================"
echo "  SSH setup complete!"
echo "================================================"
echo "  ( You can close this terminal window )"



