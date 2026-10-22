#!/bin/bash
cd "$(dirname "$0")/.." || exit 1

IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)
if [ -z "$IP" ]; then
  echo "No network address found. Connect this Mac to Wi-Fi or a hotspot first."
  exit 1
fi

if grep -q '^EXPO_PUBLIC_API_URL=' .env 2>/dev/null; then
  sed -i '' "s#^EXPO_PUBLIC_API_URL=.*#EXPO_PUBLIC_API_URL=http://$IP:3100/api/#" .env
else
  echo "EXPO_PUBLIC_API_URL=http://$IP:3100/api/" >> .env
fi

echo "Mac address: $IP"
if curl -s -m 3 "http://$IP:3100/health" >/dev/null; then
  echo "Backend: running on port 3100"
else
  echo "Backend: NOT running. In another terminal run: cd ../friendzone-backend && node server.js"
fi
echo "On each phone: open the app and pick http://$IP:8081"
echo

REACT_NATIVE_PACKAGER_HOSTNAME=$IP npx expo start --dev-client --port 8081 --lan --clear
