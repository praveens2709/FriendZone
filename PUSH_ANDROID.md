# Android push notifications (free)

The server and app code are done. What is left is Firebase and a build of the Android app.

## What works
- Notifications (likes, comments, knocks, plan invites and updates), chat messages and incoming calls reach an Android phone when the app is closed or in the background.
- When the app is open nothing is shown as a push, because live updates already appear inside the app.

## What does not
- iPhone: needs a paid Apple Developer account, so the iOS side does nothing for now.
- Calls show as a high-priority notification, not a full-screen ringing screen.

## Setup

1. **Firebase (free Spark plan).** console.firebase.google.com, Add project. Add an Android app with package name `com.friendzone.app`. Download `google-services.json` and put it in `friendzone-frontend/` (it is ignored by git).
2. **Send permission.** Firebase, Project settings, Service accounts, Generate new private key. Keep that JSON file private.
3. **Give the key to Expo.** Create a free account at expo.dev, then:
   ```
   cd friendzone-frontend
   npx eas-cli login
   npx eas-cli init
   npx eas-cli credentials
   ```
   Choose Android, then Google Service Account, then FCM V1, and upload the JSON from step 2.
4. **Build the Android app.**
   - Cloud: `npx eas-cli build --profile development --platform android` (free plan has a limited number of builds and a queue).
   - Or on your Mac with Android Studio installed: `FZ_ANDROID_PUSH=1 npx expo run:android`.
5. Install it on an Android phone, log in, and allow notifications when asked. The app registers the phone with the server.
6. Test: close the app, then knock that account or send it a message from another account.

## Notes
- If you host the API online (see HOSTING.md), set `EXPO_ACCESS_TOKEN` on the server only if you turn on push security in your Expo project.
- Dead tokens are removed automatically when Expo reports them unregistered.
