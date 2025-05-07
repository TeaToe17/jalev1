importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts(
  "https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js"
);

// Replace these with your own Firebase config keys...
const firebaseConfig = {
  apiKey: "AIzaSyD5LN2IpcCY8RpwCVRxeV8X9trBWAnZGgg",
  authDomain: "bookit-83750.firebaseapp.com",
  projectId: "bookit-83750",
  storageBucket: "bookit-83750.firebasestorage.app",
  messagingSenderId: "244206413621",
  appId: "1:244206413621:web:4b6ce1f09659632d590e7c",
  measurementId: "G-0NHM7Z1VPZ",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

console.log("its me");

messaging.onBackgroundMessage((payload) => {
  console.log(  
    "[firebase-messaging-sw.js] Received background message",
    payload
  );

  // payload.fcmOptions?.link comes from our backend API route handle
  // payload.data.link comes from the Firebase Console where link is the 'key'
  const link = payload.data?.url
  // const link = payload.data?.url || payload.data?.link;

  const notificationTitle = payload.data.customtitle;
  const notificationOptions = {
    body: payload.data.custombody,
    icon: "./logo.png",
    data: { url: link },
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
  console.log(self.registration);
});

self.addEventListener("notificationclick", function (event) {
  console.log("[firebase-messaging-sw.js] Notification click received.");

  event.notification.close();
  console.log(event);
  // This checks if the client is already open and if it is, it focuses on the tab. If it is not open, it opens a new tab with the URL passed in the notification payload
  event.waitUntil(
    clients
      // https://developer.mozilla.org/en-US/docs/Web/API/Clients/matchAll
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        const url = event.notification.data?.url;
        console.log(url);
        if (!url) return;

        // If relative URL is passed in firebase console or API route handler, it may open a new window as the client.url is the full URL i.e. https://example.com/ and the url is /about whereas if we passed in the full URL, it will focus on the existing tab i.e. https://example.com/about
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          console.log("OPENWINDOW ON CLIENT");
          return clients.openWindow(url);
        }

        self.location.assign(url);
      })
  );
});
