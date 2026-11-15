import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// The previous offline service worker cached unversioned files between releases
// and could strand Android users on a stale shell. Remove it until a versioned
// offline update strategy is validated on real devices. Never delete user data.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(
      registrations.filter(registration => registration.scope.startsWith(location.origin))
        .map(registration => registration.unregister())
    ))
    .then(() => {
      if ("caches" in window) {
        return caches.keys().then(keys => Promise.all(
          keys.filter(key => key.startsWith("tlc-battle-"))
            .map(key => caches.delete(key))
        ));
      }
    })
    .catch(error => console.warn("Legacy cache cleanup deferred:", error));
}

createRoot(document.getElementById("root")!).render(<App />);
