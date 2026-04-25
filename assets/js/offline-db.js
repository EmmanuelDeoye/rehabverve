const DB_NAME = "rehabverve-db";
const DB_VERSION = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("firebaseData")) {
        db.createObjectStore("firebaseData", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { autoIncrement: true });
      }
    };

    request.onsuccess = e => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = e => reject(e);
  });
}

async function saveFirebaseData(key, data) {
  const db = await openDB();
  const tx = db.transaction("firebaseData", "readwrite");
  tx.objectStore("firebaseData").put({ key, data });
}

async function getFirebaseData(key) {
  const db = await openDB();
  const tx = db.transaction("firebaseData", "readonly");
  return new Promise(resolve => {
    const req = tx.objectStore("firebaseData").get(key);
    req.onsuccess = () => resolve(req.result?.data || null);
  });
}